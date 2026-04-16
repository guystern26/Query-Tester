/**
 * useInjectionMarkers — derives Ace editor markers that highlight where
 * each input's rowIdentifier matches the SPL text. Debounced at 300ms
 * on identifier changes, immediate on SPL changes.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { SplWarning } from '../features/query/splLinter';

interface InjectionMatchResult {
    markers: SplWarning[];
    matchCount: number;
    hasIdentifiers: boolean;
}

/**
 * Find all case-insensitive occurrences of `needle` in `haystack`.
 * Returns array of { start, end } character indices.
 */
function findAllMatches(haystack: string, needle: string): Array<{ start: number; end: number }> {
    if (!needle) return [];
    const matches: Array<{ start: number; end: number }> = [];
    const lower = haystack.toLowerCase();
    const target = needle.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
        const idx = lower.indexOf(target, pos);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + needle.length });
        pos = idx + 1;
    }
    return matches;
}

/**
 * Merge overlapping ranges into a flat non-overlapping set.
 * Prevents double-highlighting when multiple inputs share overlapping identifiers.
 */
function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i].start <= last.end) {
            last.end = Math.max(last.end, sorted[i].end);
        } else {
            merged.push(sorted[i]);
        }
    }
    return merged;
}

export function useInjectionMarkers(): InjectionMatchResult {
    const test = useTestStore(selectActiveTest);

    const spl = test?.query?.spl ?? '';

    // Collect all non-empty rowIdentifiers from all scenarios' inputs
    const identifiers = useMemo(() => {
        if (!test) return [];
        const ids: string[] = [];
        for (const scenario of test.scenarios) {
            for (const input of scenario.inputs) {
                const trimmed = input.rowIdentifier.trim();
                if (trimmed.length >= 6) ids.push(trimmed);
            }
        }
        return [...new Set(ids)]; // deduplicate
    }, [test]);

    const hasIdentifiers = identifiers.length > 0;

    // Find all match positions and merge overlapping ranges
    const markers = useMemo<SplWarning[]>(() => {
        if (!spl || identifiers.length === 0) return [];

        const allRanges: Array<{ start: number; end: number }> = [];
        for (const id of identifiers) {
            allRanges.push(...findAllMatches(spl, id));
        }

        const merged = mergeRanges(allRanges);

        return merged.map((r) => ({
            start: r.start,
            end: r.end,
            token: spl.slice(r.start, r.end),
            message: 'Will be replaced with temp index at run time',
            severity: 'injection' as const,
            isBlocked: false,
        }));
    }, [spl, identifiers]);

    return { markers, matchCount: markers.length, hasIdentifiers };
}
