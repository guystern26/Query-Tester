import React from 'react';
import type { SavedTestMeta, ScheduledTest } from 'core/types';
import { TestsTableRow } from './TestsTableRow';

const TH = 'px-4 py-3.5 text-left text-[10px] font-bold text-slate-500/80 uppercase tracking-[0.08em]';

function SkeletonRow() {
    return (
        <tr className="border-b border-slate-800">
            {Array.from({ length: 11 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 bg-navy-700 rounded animate-pulse" style={{ width: i === 1 ? '70%' : '60%' }} />
                </td>
            ))}
        </tr>
    );
}

export interface TestsTableProps {
    tests: SavedTestMeta[];
    isLoading: boolean;
    deletingIds: Set<string>;
    togglingScheduleId: string | null;
    creatingScheduleForTestId: string | null;
    scheduleByTestId: Record<string, ScheduledTest>;
    onOpen: (id: string) => void;
    onEdit: (id: string) => void;
    onClone: (id: string) => void;
    cloningIds: Set<string>;
    onSchedule: (id: string) => void;
    onHistory: (id: string) => void;
    onToggleSchedule: (scheduleId: string, enabled: boolean) => void;
    onDelete: (id: string) => void;
    deleteErrors: Record<string, string>;
}

export function TestsTable({
    tests, isLoading, deletingIds, togglingScheduleId, creatingScheduleForTestId, scheduleByTestId,
    onOpen, onEdit, onClone, cloningIds, onSchedule, onHistory, onToggleSchedule, onDelete, deleteErrors,
}: TestsTableProps): React.ReactElement {
    if (isLoading) {
        return (
            <div className="bg-navy-800 rounded-xl border border-slate-700/20 overflow-hidden shadow-lg shadow-black/20">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700 bg-navy-900/50">
                            <th className={TH}>Name</th>
                            <th className={TH}>Description</th>
                            <th className={TH}>App</th>
                            <th className={TH}>Type</th>
                            <th className={TH + ' text-center'}>Scenarios</th>
                            <th className={TH}>Schedule</th>
                            <th className={TH}>Last Run</th>
                            <th className={TH}>Created by</th>
                            <th className={TH}>Updated</th>
                            <th className={TH}>Actions</th>
                        </tr>
                    </thead>
                    <tbody><SkeletonRow /><SkeletonRow /><SkeletonRow /></tbody>
                </table>
            </div>
        );
    }

    if (tests.length === 0) {
        return (
            <div className="bg-navy-900 rounded-lg border border-slate-800 py-20 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-navy-800 border border-slate-700/50 flex items-center justify-center shadow-inner">
                    <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-slate-300 m-0 mb-1">No tests yet</p>
                    <p className="text-xs text-slate-500 m-0">Create your first test to start validating SPL queries</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-navy-800 rounded-xl border border-slate-700/20 overflow-x-auto shadow-lg shadow-black/20">
            <table className="w-full min-w-[1280px]">
                <thead>
                    <tr className="border-b border-slate-700 bg-navy-900/50">
                        <th className={TH}>Name</th>
                        <th className={TH}>Description</th>
                        <th className={TH}>App</th>
                        <th className={TH}>Saved Search</th>
                        <th className={TH}>Type</th>
                        <th className={TH + ' text-center'}>Scenarios</th>
                        <th className={TH}>Schedule</th>
                        <th className={TH}>Last Run</th>
                        <th className={TH}>Created by</th>
                        <th className={TH}>Updated</th>
                        <th className={TH + ' whitespace-nowrap'}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tests.map((t) => (
                        <TestsTableRow
                            key={t.id}
                            test={t}
                            schedule={scheduleByTestId[t.id] || null}
                            isLoading={deletingIds.has(t.id)}
                            isToggling={!!(scheduleByTestId[t.id] && togglingScheduleId === scheduleByTestId[t.id].id)}
                            isCreatingSchedule={creatingScheduleForTestId === t.id}
                            onOpen={onOpen}
                            onEdit={onEdit}
                            onClone={onClone}
                            isCloning={cloningIds.has(t.id)}
                            onSchedule={onSchedule}
                            onHistory={onHistory}
                            onToggleSchedule={onToggleSchedule}
                            onDelete={onDelete}
                            deleteError={deleteErrors[t.id] || null}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
