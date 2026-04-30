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
}

const FILTER_PATTERN = /\b\w+\s*=\s*[^\s|)\]]+/gi;

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

export function useOrphanedFilters(spl: string, rowIdentifier: string, occurrenceIndex?: number): OrphanedFilter[] {
    var oIdx = occurrenceIndex || 0;
    return useMemo((): OrphanedFilter[] => {
        if (!spl || !rowIdentifier.trim()) return [];

        // Find the clause where this RI lives (Nth occurrence)
        var clause = findClause(spl, rowIdentifier, oIdx);

        // Find all key=value filters in that clause
        const orphans: OrphanedFilter[] = [];
        const re = new RegExp(FILTER_PATTERN.source, 'gi');
        let match = re.exec(clause);
        while (match !== null) {
            const filterText = match[0];
            // Check if this filter is covered by the row identifier
            if (rowIdentifier.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
                orphans.push({
                    text: filterText,
                    start: match.index,
                    end: match.index + filterText.length,
                });
            }
            match = re.exec(clause);
        }
        return orphans;
    }, [spl, rowIdentifier, oIdx]);
}
