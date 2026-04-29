/**
 * useInjectionMarkers — Ace editor markers from injection ranges
 * and data source extraction results.
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

    var sourceMarkers = useMemo(function (): SplWarning[] {
        if (!test || !test.fieldExtraction || !test.fieldExtraction.sources) return [];
        if (!spl) return [];
        var result: SplWarning[] = [];
        var sources = test.fieldExtraction.sources;
        for (var i = 0; i < sources.length; i++) {
            var src = sources[i];
            if (!src.rowIdentifier) continue;
            var lower = spl.toLowerCase();
            var target = src.rowIdentifier.toLowerCase();
            var pos = 0;
            while (pos < lower.length) {
                var idx = lower.indexOf(target, pos);
                if (idx === -1) break;
                result.push({
                    start: idx,
                    end: idx + src.rowIdentifier.length,
                    token: spl.slice(idx, idx + src.rowIdentifier.length),
                    message: 'Data source: ' + src.fields.join(', '),
                    severity: 'datasource' as 'datasource',
                    isBlocked: false,
                });
                pos = idx + 1;
            }
        }
        return result;
    }, [test, spl]);

    var allMarkers = useMemo(function (): SplWarning[] {
        // Injection markers take priority — filter out source markers that overlap
        var combined = markers.slice();
        for (var i = 0; i < sourceMarkers.length; i++) {
            var sm = sourceMarkers[i];
            var overlaps = false;
            for (var j = 0; j < markers.length; j++) {
                if (sm.start < markers[j].end && sm.end > markers[j].start) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) combined.push(sm);
        }
        return combined;
    }, [markers, sourceMarkers]);

    return { markers: allMarkers, matchCount: matchCount, hasIdentifiers: hasIdentifiers };
}
