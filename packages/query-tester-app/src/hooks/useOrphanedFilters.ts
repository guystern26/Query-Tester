/**
 * useOrphanedFilters — detects filters that will remain after injection.
 * Scans the base search clause (before first |) for key=value patterns
 * not covered by the row identifier.
 */
import { useMemo } from 'react';

export interface OrphanedFilter {
    text: string;
    start: number;
    end: number;
    /** True if the filter's field is extractable from the data source (optional, not harmful). */
    isOptional?: boolean;
}

const FILTER_PATTERN = /\b\w+\s*=\s*[^\s|)\]]+/gi;

/** Internal Splunk time/index fields that should never be flagged as orphaned. */
const TIME_FILTER_KEYS = new Set([
    '_time', '_index_earliest', '_index_latest', 'earliest', 'latest',
    '_indextime', 'earliest_time', 'latest_time',
]);

/**
 * Find the Nth occurrence of the RI in the SPL, then extract the clause
 * around it. If the RI is in a subsearch [search ...], returns just that
 * subsearch clause. Otherwise returns the outer base clause (before first |).
 */
function findClause(spl: string, ri: string, occurrenceIndex: number): string {
    var riLower = ri.trim().toLowerCase();
    var splLower = spl.toLowerCase();
    // Find the Nth occurrence
    var pos = -1;
    var searchFrom = 0;
    for (var n = 0; n <= occurrenceIndex; n++) {
        pos = splLower.indexOf(riLower, searchFrom);
        if (pos === -1) break;
        searchFrom = pos + 1;
    }
    if (pos === -1) {
        // Fallback: outer clause
        var pipeIdx = spl.indexOf('|');
        return pipeIdx >= 0 ? spl.slice(0, pipeIdx) : spl;
    }
    // Walk left to find the start of this clause (after [ or start of string)
    var clauseStart = 0;
    for (var i = pos - 1; i >= 0; i--) {
        if (spl[i] === '[') { clauseStart = i + 1; break; }
    }
    // Walk right to find end of clause (next | or ] or end of string)
    var clauseEnd = spl.length;
    for (var j = pos + ri.length; j < spl.length; j++) {
        if (spl[j] === '|' || spl[j] === ']') { clauseEnd = j; break; }
    }
    return spl.slice(clauseStart, clauseEnd);
}

/**
 * @param spl              — full SPL query
 * @param rowIdentifier    — the row identifier string (e.g. "index=main sourcetype=access")
 * @param occurrenceIndex  — which occurrence of the RI in the SPL (for multi-input)
 * @param sourceFields     — extracted fields belonging to this data source (from LLM).
 *                           If a filter's key matches one of these, it is marked `isOptional`
 *                           rather than flagged as a blocking orphan.
 */
export function useOrphanedFilters(
    spl: string,
    rowIdentifier: string,
    occurrenceIndex?: number,
    sourceFields?: string[],
): OrphanedFilter[] {
    var oIdx = occurrenceIndex || 0;
    var fieldsKey = sourceFields ? sourceFields.join(',') : '';
    return useMemo((): OrphanedFilter[] => {
        if (!spl || !rowIdentifier.trim()) return [];

        // Find the clause where this RI lives (Nth occurrence)
        var clause = findClause(spl, rowIdentifier, oIdx);

        // Build a set of known source fields (lowercase) for optional-field marking
        var knownFields = new Set<string>();
        if (sourceFields) {
            for (var fi = 0; fi < sourceFields.length; fi++) {
                knownFields.add(sourceFields[fi].toLowerCase());
            }
        }

        // Find all key=value filters in that clause
        const orphans: OrphanedFilter[] = [];
        const re = new RegExp(FILTER_PATTERN.source, 'gi');
        let match = re.exec(clause);
        while (match !== null) {
            const filterText = match[0];
            // Extract the key from "key=value"
            const eqIdx = filterText.indexOf('=');
            const filterKey = eqIdx >= 0 ? filterText.slice(0, eqIdx).trim().toLowerCase() : '';

            // Skip internal Splunk time fields — they are set by the time picker
            if (TIME_FILTER_KEYS.has(filterKey)) {
                match = re.exec(clause);
                continue;
            }

            // Check if this filter is covered by the row identifier
            if (rowIdentifier.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
                orphans.push({
                    text: filterText,
                    start: match.index,
                    end: match.index + filterText.length,
                    isOptional: knownFields.has(filterKey),
                });
            }
            match = re.exec(clause);
        }
        return orphans;
    }, [spl, rowIdentifier, oIdx, fieldsKey]);
}
