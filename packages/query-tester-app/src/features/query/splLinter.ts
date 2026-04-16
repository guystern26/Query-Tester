/**
 * splLinter.ts — Client-side SPL linter.
 *
 * Analyses an SPL string and returns a list of warnings, each with
 * a character range so the editor overlay can highlight the offending token.
 *
 * Runs on blur only — never while the user is typing.
 * When commandPolicy is provided, it replaces the hardcoded COMMAND_WARNINGS.
 */
import type { CommandPolicyEntry } from 'core/types/config';
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
    severity: 'error' | 'warning' | 'info' | 'field' | 'injection';
    /** Whether this command is blocked by policy. */
    isBlocked: boolean;
    /** Color index for field-tracking highlights (only when severity === 'field'). */
    colorIndex?: number;
}

// ── Severity mapping ─────────────────────────────────────────────────────────

const POLICY_SEVERITY_MAP: Record<string, SplWarning['severity']> = {
    danger: 'error',
    warning: 'warning',
    info: 'info',
};

// ── Linter ─────────────────────────────────────────────────────────────────────

/**
 * Lint an SPL string and return a list of warnings with positions.
 * When policy is provided and non-empty, command highlighting uses it
 * exclusively instead of the hardcoded COMMAND_WARNINGS.
 */
export function lintSpl(spl: string, policy?: CommandPolicyEntry[]): SplWarning[] {
    if (!spl.trim()) return [];

    const warnings: SplWarning[] = [];
    const masked = maskQuotedStrings(spl);
    const usePolicy = policy !== undefined && policy.length > 0;
    const policyMap = usePolicy ? buildPolicyMap(policy!) : null;

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
                start: cmdStart, end: cmdEnd, token: cmd,
                message: 'Did you mean "' + TYPO_MAP[cmdLower] + '"?',
                severity: 'warning', isBlocked: false,
            });
        } else if (!KNOWN_COMMANDS.has(cmdLower)) {
            warnings.push({
                start: cmdStart, end: cmdEnd, token: cmd,
                message: 'Unknown command "' + cmd + '". Check for typos.',
                severity: 'warning', isBlocked: false,
            });
        } else if (policyMap && policyMap[cmdLower]) {
            const entry = policyMap[cmdLower];
            const blocked = !entry.allowed;
            const msg = buildPolicyMessage(entry);
            warnings.push({
                start: cmdStart, end: cmdEnd, token: cmd,
                message: msg,
                severity: POLICY_SEVERITY_MAP[entry.severity] || 'warning',
                isBlocked: blocked,
            });
        } else if (!usePolicy && COMMAND_WARNINGS[cmdLower]) {
            warnings.push({
                start: cmdStart, end: cmdEnd, token: cmd,
                message: COMMAND_WARNINGS[cmdLower],
                severity: COMMAND_WARNINGS[cmdLower].includes('blocked') ? 'error' : 'info',
                isBlocked: false,
            });
        }
    }

    // 2. Cache macro detection: `cache(...)`
    const cacheRe = /`cache\(([^)]*)\)`/g;
    let cacheMatch: RegExpExecArray | null;
    while ((cacheMatch = cacheRe.exec(spl)) !== null) {
        const args = cacheMatch[1].split(',').map((a) => a.trim().replace(/^["']|["']$/g, ''));
        const testingVal = args.length > 4 ? args[4].replace(/^["']|["']$/g, '') : '';
        const isTesting = testingVal === 'true' || testingVal === 'True' || testingVal === '1';
        const lookupName = args[0] || 'unknown';
        warnings.push({
            start: cacheMatch.index, end: cacheMatch.index + cacheMatch[0].length,
            token: 'cache', isBlocked: false, colorIndex: undefined,
            severity: isTesting ? 'info' : 'warning',
            message: isTesting
                ? 'cache macro "' + lookupName + '" — testing=true, safe to run. You can also use testing=false: the lookup will be swapped with a temp copy automatically.'
                : 'cache macro "' + lookupName + '" — the lookup will be replaced with a temp copy to protect production data. The temp lookup persists for your test session.',
        });
    }

    // 3. Trailing pipes
    const trailingMatch = /\|\s*$/.exec(masked);
    if (trailingMatch) {
        warnings.push({
            start: trailingMatch.index, end: trailingMatch.index + 1,
            token: '|', message: 'Pipe without a command after it.',
            severity: 'warning', isBlocked: false,
        });
    }

    // 4. Empty pipes
    const emptyPipeRe = /\|\s*(?=\|)/g;
    while ((match = emptyPipeRe.exec(masked)) !== null) {
        warnings.push({
            start: match.index, end: match.index + 1,
            token: '|', message: 'Empty pipe \u2014 no command between pipes.',
            severity: 'warning', isBlocked: false,
        });
    }

    warnings.sort((a, b) => a.start - b.start);
    return warnings;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPolicyMap(
    policy: CommandPolicyEntry[],
): Record<string, CommandPolicyEntry> {
    const map: Record<string, CommandPolicyEntry> = {};
    for (const e of policy) {
        map[e.command.toLowerCase()] = e;
    }
    return map;
}

function buildPolicyMessage(entry: CommandPolicyEntry): string {
    const prefix = entry.allowed ? '' : 'Blocked: ';
    if (entry.label) return prefix + entry.label;
    return entry.allowed ? 'Flagged command' : 'Blocked command';
}

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
