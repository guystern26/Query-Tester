/**
 * chatUtils.ts — Utilities for IDE chat: base search extraction, action block parsing.
 */

export interface ParsedAction {
    id: string;
    type: 'run_query' | 'update_spl';
    payload: string;
}

const AGGREGATION_COMMANDS = [
    'stats', 'chart', 'timechart', 'eventstats', 'streamstats',
    'top', 'rare', 'xyseries', 'untable', 'transpose',
];

const AGGREGATION_PATTERN = new RegExp(
    '\\|\\s*(' + AGGREGATION_COMMANDS.join('|') + ')\\b',
    'i',
);

/**
 * Extract the base search (before the first aggregation command).
 * Returns full SPL if no aggregation is found.
 */
export function extractBaseSearch(spl: string): string {
    const match = AGGREGATION_PATTERN.exec(spl);
    if (!match) return spl.trim();
    const before = spl.slice(0, match.index).trim();
    return before || spl.trim();
}

const ACTION_BLOCK_REGEX = /~~~action:(run_query|update_spl)\n([\s\S]*?)~~~/g;

const DANGEROUS_COMMANDS = /\b(delete|outputlookup|collect|sendemail|outputcsv|outputtelemetry)\b/i;

/**
 * Parse ~~~action:type\n...\n~~~ blocks from LLM response text.
 * Returns cleaned text (blocks removed) and a typed action list.
 * Blocks run_query actions that contain data-modifying commands.
 */
export function parseActionBlocks(content: string): {
    cleanContent: string;
    actions: ParsedAction[];
} {
    const actions: ParsedAction[] = [];
    let actionIndex = 0;

    const cleanContent = content.replace(ACTION_BLOCK_REGEX, (_match, type, payload) => {
        const trimmed = (payload as string).trim();
        if (type === 'run_query' && DANGEROUS_COMMANDS.test(trimmed)) {
            return '\n(Blocked: query contains a data-modifying command)\n';
        }
        actions.push({
            id: 'action-' + actionIndex++,
            type: type as ParsedAction['type'],
            payload: trimmed,
        });
        return '';
    }).trim();

    return { cleanContent, actions };
}
