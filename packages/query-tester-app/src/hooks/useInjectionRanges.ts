/**
 * useInjectionRanges — derives character-level injection match ranges.
 * Shared by both the Ace editor markers and the sidebar HTML renderer.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

export interface InjectionRange {
    start: number;
    end: number;
    colorIndex: number;
}

export interface InjectionRangeResult {
    ranges: InjectionRange[];
    matchCount: number;
    hasIdentifiers: boolean;
}

function findAllMatches(haystack: string, needle: string): Array<{ start: number; end: number }> {
    if (!needle) return [];
    var matches: Array<{ start: number; end: number }> = [];
    var lower = haystack.toLowerCase();
    var target = needle.toLowerCase();
    var pos = 0;
    while (pos < lower.length) {
        var idx = lower.indexOf(target, pos);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + needle.length });
        pos = idx + 1;
    }
    return matches;
}

export function useInjectionRanges(): InjectionRangeResult {
    var test = useTestStore(selectActiveTest);
    var spl = (test && test.query && test.query.spl) || '';

    var indexedIds = useMemo(function () {
        if (!test || test.testType === 'query_only') return [];
        var result: Array<{ id: string; colorIndex: number }> = [];
        var idx = 0;
        for (var si = 0; si < test.scenarios.length; si++) {
            var scenario = test.scenarios[si];
            for (var ii = 0; ii < scenario.inputs.length; ii++) {
                var trimmed = scenario.inputs[ii].rowIdentifier.trim();
                if (trimmed.length >= 6) {
                    result.push({ id: trimmed, colorIndex: idx });
                    idx++;
                }
            }
        }
        return result;
    }, [test]);

    var hasIdentifiers = indexedIds.length > 0;

    var ranges = useMemo(function (): InjectionRange[] {
        if (!spl || indexedIds.length === 0) return [];
        var all: InjectionRange[] = [];
        for (var i = 0; i < indexedIds.length; i++) {
            var entry = indexedIds[i];
            var matches = findAllMatches(spl, entry.id);
            for (var j = 0; j < matches.length; j++) {
                all.push({
                    start: matches[j].start,
                    end: matches[j].end,
                    colorIndex: entry.colorIndex,
                });
            }
        }
        return all;
    }, [spl, indexedIds]);

    return { ranges: ranges, matchCount: ranges.length, hasIdentifiers: hasIdentifiers };
}
