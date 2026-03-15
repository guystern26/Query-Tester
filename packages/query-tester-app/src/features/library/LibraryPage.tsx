import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ScheduledTest } from 'core/types';
import { Message } from '../../common';
import { LibraryFilters } from './LibraryFilters';
import { TestsTable } from './TestsTable';
import { ScheduleModal } from '../suites/ScheduleModal';
import { RunHistoryDrawer } from '../suites/RunHistoryDrawer';

export interface LibraryPageProps {
    onNavigateBuilder: (testId?: string) => void;
}

export function LibraryPage({ onNavigateBuilder }: LibraryPageProps) {
    const store = useTestStore();
    const {
        savedTests, isLoadingLibrary, libraryError,
        fetchSavedTests, deleteSavedTest, clearLibraryError,
        scheduledTests, fetchScheduledTests, updateScheduledTest,
        isLoadingScheduled, togglingScheduleId, scheduledError,
    } = store;

    const [search, setSearch] = useState('');
    const [appFilter, setAppFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Schedule modal state
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduledTest | null>(null);
    const [scheduleTestId, setScheduleTestId] = useState<string | null>(null);

    // Run history drawer state
    const [historyTest, setHistoryTest] = useState<ScheduledTest | null>(null);

    // Schedule save toast
    const [scheduleToast, setScheduleToast] = useState<string | null>(null);
    const prevLoadingRef = React.useRef(false);
    useEffect(() => {
        if (prevLoadingRef.current && !isLoadingScheduled) {
            // Finished saving
            if (scheduledError) {
                setScheduleToast('Failed to save schedule');
            } else {
                setScheduleToast('Schedule saved');
            }
            const timer = setTimeout(() => setScheduleToast(null), 2500);
            return () => clearTimeout(timer);
        }
        prevLoadingRef.current = isLoadingScheduled;
    }, [isLoadingScheduled, scheduledError]);

    useEffect(() => { fetchSavedTests(); fetchScheduledTests(); }, [fetchSavedTests, fetchScheduledTests]);

    // Map testId -> ScheduledTest for quick lookup
    const scheduleByTestId = useMemo(() => {
        const map: Record<string, ScheduledTest> = {};
        scheduledTests.forEach((s) => { map[s.testId] = s; });
        return map;
    }, [scheduledTests]);

    const apps = useMemo(() => {
        const set = new Set(savedTests.map((t) => t.app).filter(Boolean));
        return Array.from(set).sort();
    }, [savedTests]);

    const filtered = useMemo(() => {
        let list = savedTests;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter((t) => t.name.toLowerCase().includes(q));
        }
        if (appFilter) list = list.filter((t) => t.app === appFilter);
        if (typeFilter) {
            list = list.filter((t) => t.testType === typeFilter || t.validationType === typeFilter);
        }
        return list;
    }, [savedTests, search, appFilter, typeFilter]);

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
        setDeleteError(null);
        setLoadingRowId(id);
        try {
            await deleteSavedTest(id);
            // Refresh scheduled tests in case backend cascade-deleted a schedule
            fetchScheduledTests();
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoadingRowId(null);
        }
    }, [deleteSavedTest, fetchScheduledTests]);

    const handleToggleSchedule = useCallback(async (scheduleId: string, enabled: boolean) => {
        await updateScheduledTest(scheduleId, { enabled });
    }, [updateScheduledTest]);

    const handleCreateNew = useCallback(() => {
        onNavigateBuilder();
    }, [onNavigateBuilder]);

    const handleScheduleClose = useCallback(() => {
        setScheduleModalOpen(false);
        setEditingSchedule(null);
        setScheduleTestId(null);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden">
            <header className="sticky top-0 z-50 h-14 bg-navy-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
                <span className="text-base font-bold text-slate-200 tracking-tight">Query Tester</span>
                <nav className="flex items-center gap-1">
                    <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-600/20 text-accent-300 cursor-pointer">Library</button>
                    <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer" onClick={() => onNavigateBuilder()}>Builder</button>
                </nav>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-100 m-0">Test Library</h1>
                        <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white shadow-sm transition cursor-pointer" onClick={handleCreateNew}>+ Create New Test</button>
                    </div>

                    <LibraryFilters
                        search={search} onSearchChange={setSearch}
                        appFilter={appFilter} onAppFilterChange={setAppFilter} apps={apps}
                        typeFilter={typeFilter} onTypeFilterChange={setTypeFilter}
                    />

                    {libraryError && (
                        <Message type="error" dismissible onDismiss={clearLibraryError}>{libraryError}</Message>
                    )}

                    <TestsTable
                        tests={filtered}
                        isLoading={isLoadingLibrary && savedTests.length === 0}
                        loadingRowId={loadingRowId}
                        togglingScheduleId={togglingScheduleId}
                        scheduleByTestId={scheduleByTestId}
                        onOpen={handleOpen}
                        onEdit={handleOpen}
                        onSchedule={handleSchedule}
                        onHistory={handleHistory}
                        onToggleSchedule={handleToggleSchedule}
                        onDelete={handleDelete}
                        deleteError={deleteError}
                    />
                </div>
            </div>

            {/* Saving indicator */}
            {isLoadingScheduled && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-blue-900/90 border border-blue-700 text-blue-300 text-xs font-medium rounded-lg shadow-lg animate-pulse">
                    Saving schedule...
                </div>
            )}

            {/* Success/error toast */}
            {scheduleToast && !isLoadingScheduled && (
                <div className={'fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 text-xs font-medium rounded-lg shadow-lg ' + (scheduleToast.includes('Failed') ? 'bg-red-900/90 border border-red-700 text-red-300' : 'bg-green-900/90 border border-green-700 text-green-300')}>
                    {scheduleToast}
                </div>
            )}

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
