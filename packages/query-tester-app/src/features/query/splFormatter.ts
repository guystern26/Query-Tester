/**
 * splFormatter.ts — Format SPL with each pipe on its own line.
 * Preserves pipes inside quoted strings and square brackets.
 */

/**
 * Format SPL so each pipe stage starts on a new line.
 * Skips pipes inside double-quoted strings, single-quoted strings,
 * and square brackets (subsearches use [...] but those usually nest pipes).
 */
export function formatSpl(spl: string): string {
    if (!spl.trim()) return spl;

    const result: string[] = [];
    let inDouble = false;
    let inSingle = false;
    let bracketDepth = 0;
    let i = 0;

    while (i < spl.length) {
        const ch = spl[i];

        // Track string boundaries
        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            result.push(ch);
            i++;
            continue;
        }
        if (ch === "'" && !inDouble) {
            inSingle = !inSingle;
            result.push(ch);
            i++;
            continue;
        }

        // Skip content inside strings
        if (inDouble || inSingle) {
            result.push(ch);
            i++;
            continue;
        }

        // Track bracket depth (subsearches)
        if (ch === '[') {
            bracketDepth++;
            result.push(ch);
            i++;
            continue;
        }
        if (ch === ']' && bracketDepth > 0) {
            bracketDepth--;
            result.push(ch);
            i++;
            continue;
        }

        // Pipe at top level — insert newline before it
        if (ch === '|' && bracketDepth === 0) {
            // Trim trailing whitespace from previous content
            while (result.length > 0 && (result[result.length - 1] === ' ' || result[result.length - 1] === '\t')) {
                result.pop();
            }
            // Skip whitespace before the pipe
            // Add newline + pipe
            result.push('\n| ');
            i++;
            // Skip any whitespace after the pipe
            while (i < spl.length && (spl[i] === ' ' || spl[i] === '\t')) {
                i++;
            }
            continue;
        }

        // Collapse existing newlines + whitespace into a single space (normalize)
        if (ch === '\n' || ch === '\r') {
            // Skip all consecutive whitespace/newlines
            while (i < spl.length && /\s/.test(spl[i])) {
                i++;
            }
            // Only add a space if the last char isn't already whitespace
            if (result.length > 0 && result[result.length - 1] !== ' ' && result[result.length - 1] !== '\n') {
                result.push(' ');
            }
            continue;
        }

        result.push(ch);
        i++;
    }

    let formatted = result.join('');
    // Remove leading newline if the first char is a pipe-newline
    if (formatted.startsWith('\n')) {
        formatted = formatted.slice(1);
    }
    return formatted;
}
