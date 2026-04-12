import { useState, useMemo } from 'react';
import type { SavedTestMeta, ScheduledTest } from 'core/types';

export function useLibraryFilters(
    savedTests: SavedTestMeta[],
    scheduleByTestId: Record<string, ScheduledTest>,
) {
    const [search, setSearch] = useState('');
    const [appFilter, setAppFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [creatorFilter, setCreatorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [savedSearchFilter, setSavedSearchFilter] = useState('');

    const apps = useMemo(() => {
        const set = new Set(savedTests.map((t) => t.app).filter(Boolean));
        return Array.from(set).sort();
    }, [savedTests]);

    const creators = useMemo(() => {
        const set = new Set(savedTests.map((t) => t.createdBy).filter(Boolean));
        return Array.from(set).sort();
    }, [savedTests]);

    const savedSearches = useMemo(() => {
        const set = new Set(savedTests.map((t) => t.savedSearchOrigin).filter(Boolean) as string[]);
        return Array.from(set).sort();
    }, [savedTests]);

    const filtered = useMemo(() => {
        let list = savedTests;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((t) => t.name.toLowerCase().includes(q));
        }
        if (appFilter) list = list.filter((t) => t.app === appFilter);
        if (typeFilter) list = list.filter((t) => t.validationType === typeFilter);
        if (creatorFilter) list = list.filter((t) => t.createdBy === creatorFilter);
        if (savedSearchFilter) list = list.filter((t) => t.savedSearchOrigin === savedSearchFilter);
        if (statusFilter) {
            list = list.filter((t) => {
                const sched = scheduleByTestId[t.id];
                const lastStatus = sched?.lastRunStatus ?? null;
                if (statusFilter === 'no_runs') return lastStatus === null;
                return lastStatus === statusFilter;
            });
        }
        return list;
    }, [savedTests, search, appFilter, typeFilter, creatorFilter, savedSearchFilter, statusFilter, scheduleByTestId]);

    return {
        search, setSearch,
        appFilter, setAppFilter, apps,
        typeFilter, setTypeFilter,
        creatorFilter, setCreatorFilter, creators,
        savedSearchFilter, setSavedSearchFilter, savedSearches,
        statusFilter, setStatusFilter,
        filtered,
    };
}
