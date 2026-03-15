import React from 'react';
import type { SavedTestMeta, ScheduledTest } from 'core/types';
import { TestsTableRow } from './TestsTableRow';

const TH = 'px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider';

function SkeletonRow() {
    return (
        <tr className="border-b border-slate-800">
            {Array.from({ length: 10 }).map((_, i) => (
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
    loadingRowId: string | null;
    togglingScheduleId: string | null;
    scheduleByTestId: Record<string, ScheduledTest>;
    onOpen: (id: string) => void;
    onEdit: (id: string) => void;
    onSchedule: (id: string) => void;
    onHistory: (id: string) => void;
    onToggleSchedule: (scheduleId: string, enabled: boolean) => void;
    onDelete: (id: string) => void;
    deleteError: string | null;
}

export function TestsTable({
    tests, isLoading, loadingRowId, togglingScheduleId, scheduleByTestId,
    onOpen, onEdit, onSchedule, onHistory, onToggleSchedule, onDelete, deleteError,
}: TestsTableProps) {
    if (isLoading) {
        return (
            <div className="bg-navy-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700">
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
            <div className="bg-navy-900 rounded-xl border border-slate-800 py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </div>
                <p className="text-sm text-slate-400 m-0">No tests yet. Click 'Create New Test' to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-navy-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-700">
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
                <tbody>
                    {tests.map((t) => (
                        <TestsTableRow
                            key={t.id}
                            test={t}
                            schedule={scheduleByTestId[t.id] || null}
                            isLoading={loadingRowId === t.id}
                            isToggling={!!(scheduleByTestId[t.id] && togglingScheduleId === scheduleByTestId[t.id].id)}
                            onOpen={onOpen}
                            onEdit={onEdit}
                            onSchedule={onSchedule}
                            onHistory={onHistory}
                            onToggleSchedule={onToggleSchedule}
                            onDelete={onDelete}
                            deleteError={loadingRowId === t.id ? deleteError : null}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
