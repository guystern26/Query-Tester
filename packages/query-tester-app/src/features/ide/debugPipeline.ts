/**
 * debugPipeline.ts — Split SPL at pipe boundaries and run progressive prefixes.
 * Used by the writer agent to debug queries pipe-by-pipe.
 */

import type { IdeRunResponse } from '../../api/ideApi';
import type { AgentStep } from './agentLoop';

const MAX_PIPE_STAGES = 15;

/**
 * Split SPL into progressively longer prefixes at top-level pipe boundaries.
 * Respects quoted strings and subsearch brackets [...].
 */
export function splitPipeline(spl: string): string[] {
    const pipeIndices: number[] = [];
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let bracketDepth = 0;
    let parenDepth = 0;

    for (let i = 0; i < spl.length; i++) {
        const ch = spl[i];
        const prev = i > 0 ? spl[i - 1] : '';

        if (ch === '"' && prev !== '\\' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
        } else if (ch === "'" && prev !== '\\' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
        } else if (!inDoubleQuote && !inSingleQuote) {
            if (ch === '[') bracketDepth++;
            else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
            else if (ch === '(') parenDepth++;
            else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
            else if (ch === '|' && bracketDepth === 0 && parenDepth === 0) {
                pipeIndices.push(i);
            }
        }
    }

    if (pipeIndices.length === 0) return [spl.trim()];

    const prefixes: string[] = [spl.slice(0, pipeIndices[0]).trim()];
    const limit = Math.min(pipeIndices.length, MAX_PIPE_STAGES);
    for (let i = 1; i <= limit; i++) {
        const end = i < pipeIndices.length ? pipeIndices[i] : spl.length;
        prefixes.push(spl.slice(0, end).trim());
    }
    if (pipeIndices.length > MAX_PIPE_STAGES) {
        prefixes.push(spl.trim());
    }

    return prefixes;
}

function formatRows(rows: Record<string, string>[], max: number): string {
    const subset = rows.slice(0, max);
    if (subset.length === 0) return '(0 results)';
    const keys = Object.keys(subset[0]);
    const header = '| ' + keys.join(' | ') + ' |';
    const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
    const body = subset
        .map((r) => '| ' + keys.map((k) => String(r[k] ?? '').slice(0, 60)).join(' | ') + ' |')
        .join('\n');
    return header + '\n' + sep + '\n' + body;
}

/**
 * Run each prefix progressively, emitting AgentStep updates.
 * Returns a markdown summary of all stages.
 */
export async function runDebugPipeline(
    spl: string,
    executeQuery: (q: string) => Promise<IdeRunResponse>,
    onStep: (step: AgentStep) => void,
    signal: AbortSignal,
): Promise<string> {
    const prefixes = splitPipeline(spl);
    const parts: string[] = ['# Debug Pipeline Results\n'];

    for (let i = 0; i < prefixes.length; i++) {
        if (signal.aborted) break;

        const prefix = prefixes[i];
        const label = 'Pipe ' + (i + 1) + '/' + prefixes.length + ': ' + prefix.slice(-60);
        const stepId = 'debug-' + i;

        const step: AgentStep = { id: stepId, type: 'debug_step', spl: prefix, status: 'running', label };
        onStep(step);

        try {
            const trimmed = prefix.trimEnd();
            const safePrefix = trimmed.endsWith(']')
                ? trimmed.slice(0, -1) + ' | head 5]'
                : prefix + ' | head 5';
            const resp = await executeQuery(safePrefix);
            const rows = resp.resultRows || [];
            onStep({ ...step, status: 'success', rows, resultCount: resp.resultCount });
            parts.push('## Stage ' + (i + 1) + ': `' + prefix.slice(-80) + '`');
            parts.push(resp.resultCount + ' results. Sample:');
            parts.push(formatRows(rows, 3));
            parts.push('');
        } catch (e) {
            const err = e as { message?: string };
            onStep({ ...step, status: 'error', error: err.message });
            parts.push('## Stage ' + (i + 1) + ': `' + prefix.slice(-80) + '`');
            parts.push('ERROR: ' + (err.message || 'Query failed'));
            parts.push('');
        }
    }

    return parts.join('\n');
}
