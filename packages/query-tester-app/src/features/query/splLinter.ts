/**
 * splLinter.ts — Client-side SPL linter.
 *
 * Analyses an SPL string and returns a list of warnings, each with
 * a character range so the editor overlay can highlight the offending token.
 *
 * Runs on blur only — never while the user is typing.
 */
import { KNOWN_COMMANDS, TYPO_MAP, COMMAND_WARNINGS } from './splLinterRules';

// ── Lint result ────────────────────────────────────────────────────────────────

export interface SplWarning {
    /** Start character index in the SPL string. */
    start: number;
    /** End character index (exclusive). */
    end: number;
    /** The token that was flagged. */
    token: string;
    /** Human-readable explanation. */
    message: string;
    /** Severity — drives styling. */
    severity: 'error' | 'warning' | 'info';
}

// ── Linter ─────────────────────────────────────────────────────────────────────

/**
 * Lint an SPL string and return a list of warnings with positions.
 * Designed to run on blur — call this only when the editor loses focus.
 */
export function lintSpl(spl: string): SplWarning[] {
    if (!spl.trim()) return [];

    const warnings: SplWarning[] = [];
    const masked = maskQuotedStrings(spl);

    // 1. Find all pipe-command tokens
    const pipeCommandRe = /\|\s*([a-zA-Z_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = pipeCommandRe.exec(masked)) !== null) {
        const cmd = match[1];
        const cmdLower = cmd.toLowerCase();
        const cmdStart = match.index + match[0].indexOf(cmd);
        const cmdEnd = cmdStart + cmd.length;

        if (!KNOWN_COMMANDS.has(cmdLower) && TYPO_MAP[cmdLower]) {
            warnings.push({
                start: cmdStart,
                end: cmdEnd,
                token: cmd,
                message: 'Did you mean "' + TYPO_MAP[cmdLower] + '"?',
                severity: 'warning',
            });
        } else if (!KNOWN_COMMANDS.has(cmdLower)) {
            warnings.push({
                start: cmdStart,
                end: cmdEnd,
                token: cmd,
                message: 'Unknown command "' + cmd + '". Check for typos.',
                severity: 'warning',
            });
        } else if (COMMAND_WARNINGS[cmdLower]) {
            warnings.push({
                start: cmdStart,
                end: cmdEnd,
                token: cmd,
                message: COMMAND_WARNINGS[cmdLower],
                severity: COMMAND_WARNINGS[cmdLower].includes('blocked')
                    ? 'error'
                    : 'info',
            });
        }
    }

    // 2. Trailing pipes (| at end, or | followed only by whitespace)
    const trailingPipeRe = /\|\s*$/;
    const trailingMatch = trailingPipeRe.exec(masked);
    if (trailingMatch) {
        warnings.push({
            start: trailingMatch.index,
            end: trailingMatch.index + 1,
            token: '|',
            message: 'Pipe without a command after it.',
            severity: 'warning',
        });
    }

    // 3. Empty pipes (| followed by another |)
    const emptyPipeRe = /\|\s*(?=\|)/g;
    while ((match = emptyPipeRe.exec(masked)) !== null) {
        warnings.push({
            start: match.index,
            end: match.index + 1,
            token: '|',
            message: 'Empty pipe — no command between pipes.',
            severity: 'warning',
        });
    }

    warnings.sort((a, b) => a.start - b.start);
    return warnings;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Replace quoted string contents with spaces to avoid false positives. */
function maskQuotedStrings(spl: string): string {
    const chars = Array.from(spl);
    let i = 0;
    while (i < chars.length) {
        const ch = chars[i];
        if (ch === '"' || ch === "'") {
            const quote = ch;
            i++;
            while (i < chars.length) {
                if (chars[i] === '\\' && i + 1 < chars.length) {
                    chars[i] = ' ';
                    chars[i + 1] = ' ';
                    i += 2;
                    continue;
                }
                if (chars[i] === quote) break;
                chars[i] = ' ';
                i++;
            }
        }
        i++;
    }
    return chars.join('');
}
