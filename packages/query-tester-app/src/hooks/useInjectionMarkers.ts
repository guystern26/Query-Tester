/**
 * useInjectionMarkers — Ace editor markers from injection ranges.
 * Delegates matching logic to useInjectionRanges.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useInjectionRanges } from './useInjectionRanges';
import type { SplWarning } from '../features/query/splLinter';

interface InjectionMatchResult {
    markers: SplWarning[];
    matchCount: number;
    hasIdentifiers: boolean;
}

export function useInjectionMarkers(): InjectionMatchResult {
    var test = useTestStore(selectActiveTest);
    var spl = (test && test.query && test.query.spl) || '';
    var { ranges, matchCount, hasIdentifiers } = useInjectionRanges();

    var markers = useMemo(function (): SplWarning[] {
        if (!spl || ranges.length === 0) return [];
        var result: SplWarning[] = [];
        for (var i = 0; i < ranges.length; i++) {
            var r = ranges[i];
            result.push({
                start: r.start,
                end: r.end,
                token: spl.slice(r.start, r.end),
                message: 'Will be replaced with temp index at run time',
                severity: 'injection' as 'injection',
                isBlocked: false,
                colorIndex: r.colorIndex,
            });
        }
        return result;
    }, [spl, ranges]);

    return { markers: markers, matchCount: matchCount, hasIdentifiers: hasIdentifiers };
}
