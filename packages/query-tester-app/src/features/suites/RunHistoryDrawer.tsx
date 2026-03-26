import React, { useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ScheduledTest } from 'core/types';
import { RunHistoryRow } from './RunHistoryRow';

export interface RunHistoryDrawerProps {
    open: boolean;
    onClose: () => void;
    test: ScheduledTest | null;
}

export function RunHistoryDrawer({ open, onClose, test }: RunHistoryDrawerProps) {
    const runHistory = useTestStore((s) => s.runHistory);
    const fetchRunHistory = useTestStore((s) => s.fetchRunHistory);
    const isLoadingHistory = useTestStore((s) => s.isLoadingHistory);

    const testId = test?.id || '';
    const runs = runHistory[testId] || [];
    const loaded = testId in runHistory;

    useEffect(() => {
        if (open && testId && !loaded) {
            fetchRunHistory(testId);
        }
    }, [open, testId, loaded, fetchRunHistory]);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-navy-900 border-l border-slate-700 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out"
                style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-700 flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 m-0">{test?.testName || 'Run History'}</h2>
                        <p className="text-[11px] text-slate-500 m-0 mt-0.5">Last 50 runs</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {isLoadingHistory && !loaded ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12">
                            <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center">
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <circle cx="12" cy="12" r="10" />
                                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <p className="text-xs text-slate-500 m-0">No runs yet for this test.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {runs.map((run, i) => (
                                <RunHistoryRow key={run.id} run={run} isLast={i === runs.length - 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
