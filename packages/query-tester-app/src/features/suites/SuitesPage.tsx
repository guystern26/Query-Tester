import React, { useEffect, useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ScheduledTest } from 'core/types';
import { Message } from '../../common';
import { ScheduledTestsTable } from './ScheduledTestsTable';
import { LoadingState, EmptyState } from './SuitesPageStates';
import { ScheduleModal } from './ScheduleModal';
import { RunHistoryDrawer } from './RunHistoryDrawer';

export interface SuitesPageProps {
    onNavigateLibrary: () => void;
    onNavigateBuilder: () => void;
}

export function SuitesPage({ onNavigateLibrary, onNavigateBuilder }: SuitesPageProps) {
    const scheduledTests = useTestStore((s) => s.scheduledTests);
    const runHistory = useTestStore((s) => s.runHistory);
    const isLoadingScheduled = useTestStore((s) => s.isLoadingScheduled);
    const scheduledError = useTestStore((s) => s.scheduledError);
    const fetchScheduledTests = useTestStore((s) => s.fetchScheduledTests);
    const runNow = useTestStore((s) => s.runNow);
    const deleteScheduledTest = useTestStore((s) => s.deleteScheduledTest);
    const fetchRunHistory = useTestStore((s) => s.fetchRunHistory);
    const clearScheduledError = useTestStore((s) => s.clearScheduledError);

    const [runningId, setRunningId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState<ScheduledTest | null>(null);
    const [historyTest, setHistoryTest] = useState<ScheduledTest | null>(null);

    useEffect(() => { fetchScheduledTests(); }, []);

    // Fetch latest run for drift detection once tests load
    useEffect(() => {
        scheduledTests.forEach((t) => {
            if (!runHistory[t.id]) fetchRunHistory(t.id);
        });
    }, [scheduledTests]);

    const handleRunNow = useCallback(async (id: string) => {
        setRunningId(id);
        try {
            await runNow(id);
        } finally {
            setRunningId(null);
        }
    }, [runNow]);

    const handleEdit = useCallback((id: string) => {
        const test = scheduledTests.find((t) => t.id === id) || null;
        setEditingTest(test);
        setModalOpen(true);
    }, [scheduledTests]);

    const handleHistory = useCallback((id: string) => {
        const test = scheduledTests.find((t) => t.id === id) || null;
        setHistoryTest(test);
    }, [scheduledTests]);

    const handleDelete = useCallback(async (id: string) => {
        await deleteScheduledTest(id);
    }, [deleteScheduledTest]);

    const handleScheduleNew = useCallback(() => {
        setEditingTest(null);
        setModalOpen(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setModalOpen(false);
        setEditingTest(null);
    }, []);

    const isInitialLoad = isLoadingScheduled && scheduledTests.length === 0;

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden">
            {/* Top bar */}
            <header className="sticky top-0 z-50 h-14 bg-navy-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
                <span className="text-base font-bold text-slate-200 tracking-tight">Query Tester</span>
                <nav className="flex items-center gap-1">
                    <button
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer"
                        onClick={onNavigateLibrary}
                    >
                        Library
                    </button>
                    <button
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer"
                        onClick={onNavigateBuilder}
                    >
                        Builder
                    </button>
                    <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy-700 text-white border-2 border-slate-600 cursor-pointer">
                        Schedules
                    </button>
                </nav>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-100 m-0">Test Suites</h1>
                        <button
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-300 hover:bg-blue-200 text-slate-900 shadow-sm transition cursor-pointer"
                            onClick={handleScheduleNew}
                        >
                            + Schedule a Test
                        </button>
                    </div>

                    {/* Error banner */}
                    {scheduledError && (
                        <Message type="error" dismissible onDismiss={clearScheduledError}>
                            {scheduledError}
                        </Message>
                    )}

                    {/* Content states */}
                    {isInitialLoad ? (
                        <LoadingState />
                    ) : scheduledTests.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <ScheduledTestsTable
                            tests={scheduledTests}
                            lastRuns={runHistory}
                            runningId={runningId}
                            onRunNow={handleRunNow}
                            onEdit={handleEdit}
                            onHistory={handleHistory}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>

            <ScheduleModal open={modalOpen} onClose={handleModalClose} editingTest={editingTest} />
            <RunHistoryDrawer open={historyTest !== null} onClose={() => setHistoryTest(null)} test={historyTest} />
        </div>
    );
}
