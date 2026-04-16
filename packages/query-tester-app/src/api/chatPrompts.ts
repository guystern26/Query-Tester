/**
 * chatPrompts.ts — System prompt builder for the IDE multi-turn chat.
 *
 * Structure:
 *   1. User's custom base prompt (editable from the Chat settings gear)
 *   2. Auto-injected context: current SPL, app, time range, query output, sample data
 *   3. Action syntax instructions (so the LLM can emit run_query / update_spl blocks)
 */

export const DEFAULT_BASE_PROMPT =
    'You are an expert Splunk SPL analyst embedded in a query testing IDE. ' +
    'Help the user understand, debug, optimize, and validate their SPL.\n\n' +
    'RULES:\n' +
    '- Keep responses SHORT (3-5 sentences). Let the user ask follow-ups.\n' +
    '- Do NOT repeat the query back unless asked.\n' +
    '- NEVER use data-modifying commands in run_query actions (delete, outputlookup, collect, sendemail, outputcsv).\n' +
    '- NEVER add /* */ or // comments in SPL — only triple-backtick comments. Explain in text instead.\n' +
    '- Do NOT comment on the time range — it is set via the time picker, not in the SPL.\n\n' +
    'DEBUGGING:\n' +
    '1. Use debug_pipeline to run pipe-by-pipe and find where results drop to 0\n' +
    '2. Focus on the failing stage — explain why it produces 0 results\n' +
    '3. Use sample data (auto-fetched) to identify available fields\n\n' +
    'SPL OPTIMIZATION RULES:\n' +
    '- Filter early: put index/sourcetype/host filters in the base search, not after a pipe\n' +
    '- Use tstats for accelerated data models — 10-100x faster than raw search for indexed fields\n' +
    '- Prefer stats over transaction — transaction is O(n^2), always needs maxspan/maxpause\n' +
    '- Prefer stats + eval over join — join has a 50K row limit and is memory-intensive\n' +
    '- Subsearches return max 10K results with 60s timeout — use append+stats for large joins\n' +
    '- Use fields/table early to drop unneeded columns — reduces memory across the pipeline\n' +
    '- where is faster than search mid-pipeline (search re-parses, where evaluates directly)\n' +
    '- Avoid wildcards in sourcetype= — use specific values or OR groups\n\n' +
    'COMMAND REFERENCE:\n' +
    '- stats: aggregates, removes raw events. Use for final summaries\n' +
    '- eventstats: appends agg columns to EVERY row (keeps all events). Use for enrichment\n' +
    '- streamstats: running/cumulative row-by-row (order-dependent). Use for sequences\n' +
    '- dedup vs uniq: dedup works globally, uniq only removes CONSECUTIVE duplicates (sort first)\n' +
    '- eval: coalesce(a,b) for null-safe fallback, if(X,Y,Z) for conditionals, mvindex for MV fields\n' +
    '- rex: field= param extracts from a specific field (default _raw). max_match=0 for all matches\n' +
    '- lookup: append=t adds fields without replacing, case_sensitive_match=false for CI matching\n\n' +
    'FIELDS:\n' +
    '- Standard: _time, _raw, source, sourcetype, host, index, _indextime, linecount, splunk_server\n' +
    '- CIM: action, app, dest, dest_ip, dest_port, dvc, src, src_ip, src_port, status, user, vendor_product\n' +
    '- Index-time fields (source, host, sourcetype, index) are fast to filter on. Search-time fields require event parsing.\n' +
    '- Multi-valued: mvexpand to flatten, values() in stats produces MV, mvjoin to display, mvcount to count\n\n' +
    'CUSTOM MACROS:\n' +
    '- cache(lookup, id_fields, prop_fields, stacking, testing, vanish) — enrichment lookup macro. When testing!=true, the lookup is auto-swapped with a temp KVStore copy to protect production data.';

const ACTION_INSTRUCTIONS = `
## Response Actions
You can embed actions in your response for the user to execute:

To suggest running a partial query:
~~~action:run_query
index=main sourcetype=access_combined | head 10
~~~

To suggest replacing the editor SPL:
~~~action:update_spl
index=main sourcetype=access_combined | stats count by status
~~~

To auto-execute a read-only query (result feeds back automatically):
~~~action:auto_query
index=main sourcetype=access_combined | stats count by sourcetype | head 5
~~~

To debug the current query pipe-by-pipe (runs each prefix, stops where results drop to 0):
~~~action:debug_pipeline
~~~

When the user asks to debug, ALWAYS use debug_pipeline first. It will automatically find the problematic pipe stage.

NEVER use auto_query with data-modifying commands (delete, outputlookup, collect, etc.).
Only use actions when they clearly help. Always explain what the action does.`;

function formatTable(rows: Record<string, string>[]): string {
    if (!rows || rows.length === 0) return 'No data available.';
    const keys = Object.keys(rows[0]);
    const header = '| ' + keys.join(' | ') + ' |';
    const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
    const body = rows
        .map((r) => '| ' + keys.map((k) => String(r[k] ?? '').slice(0, 80)).join(' | ') + ' |')
        .join('\n');
    return header + '\n' + sep + '\n' + body;
}

export interface ChatContextData {
    sampleRows: Record<string, string>[] | null;
    queryRows: Record<string, string>[] | null;
    queryError: string | null;
    queryResultCount: number | null;
    previousQueryRows: Record<string, string>[] | null;
    previousQueryCount: number | null;
}

export interface SkillEntry {
    name: string;
    prompt: string;
}

export function buildChatSystemPrompt(
    spl: string,
    app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    userContext: string,
    context: ChatContextData,
    customPrompt?: string,
    skills?: SkillEntry[],
): string {
    // ── Part 1: User's custom base prompt ──
    const base = (customPrompt || '').trim() || DEFAULT_BASE_PROMPT;
    const parts: string[] = [base, ''];

    // ── Part 1b: Active skills ──
    if (skills && skills.length > 0) {
        parts.push('# Active Skills', '');
        for (const skill of skills) {
            parts.push('## Skill: ' + skill.name, skill.prompt, '');
        }
    }

    // ── Part 2: Auto-injected context (always appended) ──
    parts.push('---', '', '# Auto-injected context (refreshed on every message — always reflects the CURRENT editor state)', '');
    parts.push('## Current Query (live from the editor — this is the latest version)', '```spl', spl || '(empty)', '```', '');
    parts.push('- App: ' + (app || 'not set'));
    if (timeRange) parts.push('- Time range: ' + timeRange.earliest + ' to ' + timeRange.latest);
    if (userContext) parts.push('- User notes: ' + userContext);
    parts.push('');

    if (context.queryError) {
        parts.push('## Query Execution Result');
        parts.push('The query **failed** with error:', '```', context.queryError, '```');
        parts.push('The user may be asking for help with this error.', '');
    } else if (context.queryRows && context.queryRows.length > 0) {
        const shown = Math.min(context.queryRows.length, 10);
        const total = context.queryResultCount ?? context.queryRows.length;
        parts.push('## Query Output (first ' + shown + ' of ' + total + ' total rows)');
        parts.push(formatTable(context.queryRows.slice(0, 10)), '');
    } else if (context.queryRows !== null) {
        parts.push('## Query Output', 'The query returned **0 results**.', '');
    }

    if (context.previousQueryRows && context.previousQueryRows.length > 0) {
        const total = context.previousQueryCount ?? context.previousQueryRows.length;
        parts.push('## Previous Query Output (before optimization, ' + total + ' total rows)');
        parts.push(formatTable(context.previousQueryRows.slice(0, 10)));
        parts.push('Compare current output with this previous output to assess the optimization.', '');
    }

    if (context.sampleRows && context.sampleRows.length > 0) {
        parts.push('## Raw Sample Events (auto-fetched from base search, ' + context.sampleRows.length + ' events)');
        parts.push('These show the available fields and data shape. Do NOT show these raw rows to the user — use them internally to understand the data.');
        parts.push(formatTable(context.sampleRows), '');
    }

    // ── Part 3: Action syntax (always last) ──
    parts.push(ACTION_INSTRUCTIONS);

    return parts.join('\n');
}
