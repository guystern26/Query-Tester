/**
 * chatPrompts.ts — System prompt builder for the IDE multi-turn chat.
 *
 * Structure:
 *   1. User's custom base prompt (editable from the Chat settings gear)
 *   2. Auto-injected context: current SPL, app, time range, query output, sample data
 *   3. Action syntax instructions (so the LLM can emit run_query / update_spl blocks)
 */

export const DEFAULT_BASE_PROMPT =
    'You are an expert Splunk SPL assistant embedded in an IDE. ' +
    'Help the user understand, debug, and optimize their SPL query.\n\n' +
    'IMPORTANT RULES:\n' +
    '- Keep responses SHORT (3-5 sentences max). Let the user ask follow-ups.\n' +
    '- Do NOT repeat the query back unless the user asks.\n' +
    '- NEVER emit run_query actions with data-modifying commands: delete, outputlookup, collect, sendemail, outputcsv, outputtelemetry. Only use read-only queries in run_query actions.\n' +
    '- NEVER add /* */ or // comments inside SPL queries — they break SPL. Splunk only supports ```comment``` (triple backtick) comments. Prefer explaining in your message text instead of inline comments.\n' +
    '- Do NOT give notes or warnings about the time range. The time range is set by the user via the time picker — you receive it in the context below. Never suggest changing earliest/latest in the SPL itself.\n\n' +
    'When debugging:\n' +
    '1. Use debug_pipeline to run the query pipe-by-pipe — it stops at the stage where results drop to 0\n' +
    '2. Focus your analysis on the failing stage and explain why it produces 0 results\n' +
    '3. Point out common issues: missing fields, wrong field names, incorrect sourcetype\n' +
    '4. Use the sample data (auto-fetched from the base search) to identify available fields\n\n' +
    'Splunk field knowledge:\n' +
    '- Standard fields: _time, _raw, source, sourcetype, host, index, _indextime, linecount, splunk_server\n' +
    '- CIM fields: action, app, dest, dest_ip, dest_port, dvc, src, src_ip, src_port, status, user, vendor_product\n' +
    '- stats = aggregates (removes raw events), eventstats = appends agg columns to every row, streamstats = running/cumulative row-by-row\n' +
    '- transaction: always set maxspan to avoid runaway grouping\n' +
    '- Multi-valued: mvexpand to flatten, values() in stats produces mv fields, use mvjoin to display\n' +
    '- cache() macro: cache(lookup, id_fields, prop_fields, stacking, testing, vanish) — enrichment lookup. When testing!=true, lookup is auto-swapped with a temp copy';

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
