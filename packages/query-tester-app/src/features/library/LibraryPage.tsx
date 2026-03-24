import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ScheduledTest } from 'core/types';
import { Message } from '../../common';
import { LibraryFilters } from './LibraryFilters';
import { TestsTable } from './TestsTable';
import { useLibraryFilters } from './useLibraryFilters';
import { ScheduleModal } from '../suites/ScheduleModal';
import { RunHistoryDrawer } from '../suites/RunHistoryDrawer';
import { BugReportButton } from '../../components/test-navigation/BugReportButton';
import { GearIcon } from '../../components/GearIcon';

export interface LibraryPageProps {
    onNavigateBuilder: (testId?: string) => void;
}

export function LibraryPage({ onNavigateBuilder }: LibraryPageProps): React.ReactElement {
    const store = useTestStore();
    const {
        savedTests, isLoadingLibrary, libraryError,
        fetchSavedTests, deleteSavedTest, cloneSavedTest, clearLibraryError,
        scheduledTests, fetchScheduledTests, updateScheduledTest,
        isLoadingScheduled, togglingScheduleId, creatingScheduleForTestId, scheduledError,
        isAdmin, setupRequired,
    } = store;

    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
    const [cloningIds, setCloningIds] = useState<Set<string>>(new Set());

    // Schedule modal state
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduledTest | null>(null);
    const [scheduleTestId, setScheduleTestId] = useState<string | null>(null);

    // Run history drawer state
    const [historyTest, setHistoryTest] = useState<ScheduledTest | null>(null);

    const [scheduleToast, setScheduleToast] = useState<string | null>(null);
    const prevLoadingRef = React.useRef(false);
    useEffect(() => {
        if (prevLoadingRef.current && !isLoadingScheduled) {
            setScheduleToast(scheduledError ? 'Failed to save' : 'Saved');
            const timer = setTimeout(() => setScheduleToast(null), 2500);
            return () => clearTimeout(timer);
        }
        prevLoadingRef.current = isLoadingScheduled;
    }, [isLoadingScheduled, scheduledError]);

    useEffect(() => { const el = document.getElementById('qt-loading'); if (el) el.remove(); }, []);

    useEffect(() => { fetchSavedTests(); fetchScheduledTests(); }, [fetchSavedTests, fetchScheduledTests]);

    // Map testId -> ScheduledTest for quick lookup
    const scheduleByTestId = useMemo(() => {
        const map: Record<string, ScheduledTest> = {};
        scheduledTests.forEach((s) => { map[s.testId] = s; });
        return map;
    }, [scheduledTests]);

    const filters = useLibraryFilters(savedTests, scheduleByTestId);

    const handleOpen = useCallback((id: string) => {
        onNavigateBuilder(id);
    }, [onNavigateBuilder]);

    const handleSchedule = useCallback((testId: string) => {
        const existing = scheduleByTestId[testId];
        if (existing) {
            setEditingSchedule(existing);
        } else {
            setEditingSchedule(null);
            setScheduleTestId(testId);
        }
        setScheduleModalOpen(true);
    }, [scheduleByTestId]);

    const handleHistory = useCallback((testId: string) => {
        const sched = scheduleByTestId[testId];
        setHistoryTest(sched || null);
    }, [scheduleByTestId]);

    const handleDelete = useCallback(async (id: string) => {
        setDeleteErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
        setDeletingIds((prev) => new Set(prev).add(id));
        try {
            await deleteSavedTest(id);
            fetchScheduledTests();
        } catch (e) {
            setDeleteErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) }));
        } finally {
            setDeletingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [deleteSavedTest, fetchScheduledTests]);

    const handleToggleSchedule = useCallback(async (scheduleId: string, enabled: boolean) => {
        await updateScheduledTest(scheduleId, { enabled });
    }, [updateScheduledTest]);

    const handleClone = useCallback(async (id: string) => {
        setCloningIds((prev) => new Set(prev).add(id));
        try {
            await cloneSavedTest(id);
        } finally {
            setCloningIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [cloneSavedTest]);

    const handleCreateNew = useCallback(() => {
        store.addTest();
        onNavigateBuilder();
    }, [onNavigateBuilder, store]);

    const handleScheduleClose = useCallback(() => { setScheduleModalOpen(false); setEditingSchedule(null); setScheduleTestId(null); }, []);

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden">
            <header className="sticky top-0 z-50 h-14 bg-navy-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
                <span className="text-base font-bold text-slate-200 tracking-tight">Query Tester</span>
                <nav className="flex items-center gap-1">
                    <BugReportButton />
                    <div className="w-px h-5 bg-slate-700 mx-1" />
                    <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-600/20 text-accent-300 cursor-pointer">Library</button>
                    <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer" onClick={() => onNavigateBuilder()}>Builder</button>
                    {isAdmin && (
                        <button type="button" onClick={() => { window.location.hash = 'setup'; }} className="ml-1 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer rounded-lg hover:bg-navy-800">
                            <GearIcon />
                        </button>
                    )}
                </nav>
            </header>

            {isAdmin && setupRequired && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between shrink-0">
                    <span className="text-xs text-amber-300">Initial setup required &mdash; configure your deployment settings</span>
                    <button type="button" onClick={() => { window.location.hash = 'setup'; }} className="text-xs text-amber-400 hover:text-amber-200 font-semibold cursor-pointer">Go to Setup &rarr;</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-100 m-0">Test Library</h1>
                        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white shadow-sm transition cursor-pointer" onClick={handleCreateNew}>+ Create New Test</button>
                    </div>

                    <LibraryFilters
                        search={filters.search} onSearchChange={filters.setSearch}
                        appFilter={filters.appFilter} onAppFilterChange={filters.setAppFilter} apps={filters.apps}
                        typeFilter={filters.typeFilter} onTypeFilterChange={filters.setTypeFilter}
                        creatorFilter={filters.creatorFilter} onCreatorFilterChange={filters.setCreatorFilter} creators={filters.creators}
                        statusFilter={filters.statusFilter} onStatusFilterChange={filters.setStatusFilter}
                    />

                    {libraryError && (
                        <Message type="error" dismissible onDismiss={clearLibraryError}>{libraryError}</Message>
                    )}

                    <TestsTable
                        tests={filters.filtered}
                        isLoading={isLoadingLibrary && savedTests.length === 0}
                        deletingIds={deletingIds}
                        togglingScheduleId={togglingScheduleId}
                        creatingScheduleForTestId={creatingScheduleForTestId}
                        scheduleByTestId={scheduleByTestId}
                        onOpen={handleOpen}
                        onEdit={handleOpen}
                        onClone={handleClone}
                        cloningIds={cloningIds}
                        onSchedule={handleSchedule}
                        onHistory={handleHistory}
                        onToggleSchedule={handleToggleSchedule}
                        onDelete={handleDelete}
                        deleteErrors={deleteErrors}
                    />
                </div>
            </div>

            {isLoadingScheduled && <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-blue-900/90 border border-blue-700 text-blue-300 text-xs font-medium rounded-lg shadow-lg animate-pulse">Saving...</div>}
            {scheduleToast && !isLoadingScheduled && <div className={'fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 text-xs font-medium rounded-lg shadow-lg ' + (scheduleToast.includes('Failed') ? 'bg-red-900/90 border border-red-700 text-red-300' : 'bg-green-900/90 border border-green-700 text-green-300')}>{scheduleToast}</div>}
            <ScheduleModal
                open={scheduleModalOpen}
                onClose={handleScheduleClose}
                editingTest={editingSchedule}
                preselectedTestId={scheduleTestId}
            />
            <RunHistoryDrawer open={historyTest !== null} onClose={() => setHistoryTest(null)} test={historyTest} />
        </div>
    );
}
