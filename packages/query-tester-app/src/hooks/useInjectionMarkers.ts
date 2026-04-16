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


export function useInjectionMarkers(): InjectionMatchResult {
    const test = useTestStore(selectActiveTest);

    const spl = test?.query?.spl ?? '';

    // Collect rowIdentifiers with their input index for per-input coloring
    const indexedIds = useMemo(() => {
        if (!test) return [];
        const result: Array<{ id: string; colorIndex: number }> = [];
        let idx = 0;
        for (const scenario of test.scenarios) {
            for (const input of scenario.inputs) {
                const trimmed = input.rowIdentifier.trim();
                if (trimmed.length >= 6) {
                    result.push({ id: trimmed, colorIndex: idx });
                    idx++;
                }
            }
        }
        return result;
    }, [test]);

    const hasIdentifiers = indexedIds.length > 0;

    // Find match positions per input — each input gets its own colorIndex
    const markers = useMemo<SplWarning[]>(() => {
        if (!spl || indexedIds.length === 0) return [];

        const all: SplWarning[] = [];
        for (const { id, colorIndex } of indexedIds) {
            const matches = findAllMatches(spl, id);
            for (const r of matches) {
                all.push({
                    start: r.start,
                    end: r.end,
                    token: spl.slice(r.start, r.end),
                    message: 'Will be replaced with temp index at run time',
                    severity: 'injection' as const,
                    isBlocked: false,
                    colorIndex,
                });
            }
        }
        return all;
    }, [spl, indexedIds]);

    return { markers, matchCount: markers.length, hasIdentifiers };
}
