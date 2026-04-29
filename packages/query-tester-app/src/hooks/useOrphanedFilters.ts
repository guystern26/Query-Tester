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

export function useOrphanedFilters(spl: string, rowIdentifier: string): OrphanedFilter[] {
    return useMemo((): OrphanedFilter[] => {
        if (!spl || !rowIdentifier.trim()) return [];

        // Find base search clause (before first |)
        const pipeIdx = spl.indexOf('|');
        const base = pipeIdx >= 0 ? spl.slice(0, pipeIdx) : spl;

        // Find all key=value filters in base clause
        const orphans: OrphanedFilter[] = [];
        const re = new RegExp(FILTER_PATTERN.source, 'gi');
        let match = re.exec(base);
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
            match = re.exec(base);
        }
        return orphans;
    }, [spl, rowIdentifier]);
}
