/**
 * splAnalyzer — maps LLM analysis results to SplWarning arrays
 * for both code-review notes and field-tracking highlights.
 */
import type { SplWarning } from './splLinter';
import type { AnalyzeQueryNote } from '../../api/llmApi';

// ── Helpers ──────────────────────────────────────────────────────────────────────

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the Nth (1-based) occurrence of a substring in the SPL.
 * Returns { start, end } or null if not found.
 */
function findNthOccurrence(
    spl: string,
    token: string,
    n: number,
): { start: number; end: number } | null {
    let count = 0;
    let pos = 0;
    while (pos <= spl.length - token.length) {
        const idx = spl.indexOf(token, pos);
        if (idx === -1) return null;
        count++;
        if (count === n) return { start: idx, end: idx + token.length };
        pos = idx + 1;
    }
    return null;
}

// ── Note mapping ─────────────────────────────────────────────────────────────────

/** Map LLM code-review notes to SplWarning[] with severity 'info'. */
export function mapNotesToWarnings(spl: string, notes: AnalyzeQueryNote[]): SplWarning[] {
    const warnings: SplWarning[] = [];
    for (const note of notes) {
        if (!note.token) continue;
        const loc = findNthOccurrence(spl, note.token, note.occurrence || 1);
        if (!loc) continue; // silently skip hallucinated tokens
        warnings.push({
            start: loc.start,
            end: loc.end,
            token: note.token,
            message: '[' + note.category + '] ' + note.message,
            severity: 'info',
            isBlocked: false,
        });
    }
    return warnings;
}

/** Return notes that could not be matched to a position in the SPL. */
export function findUnmatchedNotes(spl: string, notes: AnalyzeQueryNote[]): AnalyzeQueryNote[] {
    return notes.filter((n) => {
        if (!n.token) return true;
        return findNthOccurrence(spl, n.token, n.occurrence || 1) === null;
    });
}

// ── Field tracking ───────────────────────────────────────────────────────────────

/** Map field names to SplWarning[] with severity 'field' and colorIndex. */
export function mapFieldsToHighlights(spl: string, fields: string[]): SplWarning[] {
    const warnings: SplWarning[] = [];
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (!field) continue;
        const pattern = new RegExp('\\b' + escapeRegex(field) + '\\b', 'g');
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(spl)) !== null) {
            warnings.push({
                start: match.index,
                end: match.index + field.length,
                token: field,
                message: 'Field: ' + field,
                severity: 'field',
                isBlocked: false,
                colorIndex: i,
            });
        }
    }
    return warnings;
}
