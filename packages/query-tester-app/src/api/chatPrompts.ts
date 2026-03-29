/**
 * chatPrompts.ts — System prompt builder for the IDE multi-turn chat.
 */

const ACTION_INSTRUCTIONS = `
## Actions
You can embed actions in your response for the user to execute:

To suggest running a partial query:
~~~action:run_query
index=main sourcetype=access_combined | head 10
~~~

To suggest updating the editor SPL:
~~~action:update_spl
index=main sourcetype=access_combined | stats count by status
~~~

Only use actions when they clearly help the user. Always explain what the action does before or after the block.`;

const DEBUGGING_GUIDANCE = `
## Debugging Guidance
When the user asks for help debugging:
1. First explain what each pipe stage does
2. Suggest stripping the query back to before the first aggregation (stats/chart/timechart) to inspect raw fields
3. Use run_query actions to let the user execute partial queries inline
4. Point out common issues: missing fields, wrong field names, time range too narrow, incorrect sourcetype`;

function formatSampleTable(rows: Record<string, string>[]): string {
    if (!rows || rows.length === 0) return 'No sample data available.';

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

export function buildChatSystemPrompt(
    spl: string,
    app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    userContext: string,
    context: ChatContextData,
): string {
    const parts: string[] = [
        'You are an expert Splunk SPL assistant embedded in an IDE. Help the user understand, debug, and improve their SPL query.',
        '',
        '## Current Query',
        '```spl',
        spl || '(empty)',
        '```',
        '',
        '## Context',
        '- App: ' + (app || 'not set'),
    ];

    if (timeRange) {
        parts.push('- Time range: ' + timeRange.earliest + ' to ' + timeRange.latest);
    }
    if (userContext) {
        parts.push('- User notes: ' + userContext);
    }

    parts.push('');

    // Full query results — the LLM sees what the query actually produces
    if (context.queryError) {
        parts.push('## Query Execution Result');
        parts.push('The query **failed** with error:');
        parts.push('```');
        parts.push(context.queryError);
        parts.push('```');
        parts.push('This is important context — the user may be asking for help with this error.');
        parts.push('');
    } else if (context.queryRows && context.queryRows.length > 0) {
        parts.push(
            '## Query Output (first ' +
                Math.min(context.queryRows.length, 10) +
                ' of ' +
                (context.queryResultCount ?? context.queryRows.length) +
                ' total rows)',
        );
        parts.push(formatSampleTable(context.queryRows.slice(0, 10)));
        parts.push('');
    } else if (context.queryRows !== null) {
        parts.push('## Query Output');
        parts.push('The query returned **0 results**.');
        parts.push('');
    }

    // Previous query results for comparison (after an optimization was applied)
    if (context.previousQueryRows && context.previousQueryRows.length > 0) {
        parts.push(
            '## Previous Query Output (before optimization, ' +
                (context.previousQueryCount ?? context.previousQueryRows.length) +
                ' total rows)',
        );
        parts.push(formatSampleTable(context.previousQueryRows.slice(0, 10)));
        parts.push('Compare the current output above with this previous output to assess the optimization.');
        parts.push('');
    }

    // Raw sample events from the base search (before aggregation)
    if (context.sampleRows && context.sampleRows.length > 0) {
        parts.push(
            '## Raw Sample Events (base search before aggregation, ' +
                context.sampleRows.length +
                ' events)',
        );
        parts.push(formatSampleTable(context.sampleRows));
        parts.push('');
    }

    parts.push(ACTION_INSTRUCTIONS);
    parts.push('');
    parts.push(DEBUGGING_GUIDANCE);

    return parts.join('\n');
}
