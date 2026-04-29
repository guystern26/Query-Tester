/**
 * useSourceSpans — maps extracted data sources to character ranges in SPL.
 * Returns spans for rendering clickable source regions in the interactive sidebar.
 * Includes regex fallback patterns for common SPL commands when LLM extraction is absent.
 */
import { useMemo } from 'react';

export interface SourceSpan {
    start: number;
    end: number;
    sourceIndex: number;
    rowIdentifier: string;
    fields: string[];
    isFallback?: boolean;
}

interface SourceSpanResult {
    spans: SourceSpan[];
}

const COMMAND_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: /(?:\|\s*)?inputlookup\s+[\w\-\.]+(?:\.csv)?/gi, label: 'inputlookup' },
    { re: /(?:\|\s*)?rest\s+[^|]+?(?=\s*\||$)/gi, label: 'rest' },
    { re: /`cache\([^)]+\)`/gi, label: 'cache' },
    { re: /\|\s*lookup\s+[\w\-\.]+/gi, label: 'lookup' },
];

function findAllOccurrences(haystack: string, needle: string): Array<{ start: number; end: number }> {
    if (!needle) return [];
    const results: Array<{ start: number; end: number }> = [];
    const lower = haystack.toLowerCase();
    const target = needle.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
        const idx = lower.indexOf(target, pos);
        if (idx === -1) break;
        results.push({ start: idx, end: idx + needle.length });
        pos = idx + 1;
    }
    return results;
}

function overlapsExisting(all: SourceSpan[], start: number, end: number): boolean {
    for (let k = 0; k < all.length; k++) {
        if (start < all[k].end && end > all[k].start) return true;
    }
    return false;
}

export function countMatches(spl: string, needle: string): number {
    return findAllOccurrences(spl, needle).length;
}

export function useSourceSpans(
    spl: string,
    sources: Array<{ rowIdentifier: string; fields: string[] }>,
): SourceSpanResult {
    const spans = useMemo((): SourceSpan[] => {
        if (!spl) return [];
        const all: SourceSpan[] = [];

        for (let i = 0; i < sources.length; i++) {
            const src = sources[i];
            const occurrences = findAllOccurrences(spl, src.rowIdentifier);
            for (let j = 0; j < occurrences.length; j++) {
                all.push({
                    start: occurrences[j].start,
                    end: occurrences[j].end,
                    sourceIndex: i,
                    rowIdentifier: src.rowIdentifier,
                    fields: src.fields,
                });
            }
        }

        // Fallback: scan for common SPL command patterns not covered by LLM extraction
        for (let p = 0; p < COMMAND_PATTERNS.length; p++) {
            const pattern = COMMAND_PATTERNS[p];
            const re = new RegExp(pattern.re.source, pattern.re.flags);
            let match = re.exec(spl);
            while (match !== null) {
                const start = match.index;
                const end = start + match[0].length;
                if (!overlapsExisting(all, start, end)) {
                    all.push({
                        start,
                        end,
                        sourceIndex: -1,
                        rowIdentifier: match[0],
                        fields: [],
                        isFallback: true,
                    });
                }
                match = re.exec(spl);
            }
        }

        // Sort by start position, longest match first for overlaps
        all.sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - a.end));
        return all;
    }, [spl, sources]);

    return { spans };
}
