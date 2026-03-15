import React, { useState } from 'react';
import type { ScheduledTest, TestRunRecord } from 'core/types';

const TH = 'px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    pass: { label: 'Pass', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
    fail: { label: 'Fail', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    error: { label: 'Error', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
};

function relativeTime(iso: string | null): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return Math.floor(days / 30) + 'mo ago';
}

export interface ScheduledTestsTableProps {
    tests: ScheduledTest[];
    lastRuns: Record<string, TestRunRecord[]>;
    runningId: string | null;
    onRunNow: (id: string) => void;
    onEdit: (id: string) => void;
    onHistory: (id: string) => void;
    onDelete: (id: string) => void;
}

export function ScheduledTestsTable({
    tests, lastRuns, runningId, onRunNow, onEdit, onHistory, onDelete,
}: ScheduledTestsTableProps) {
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const iconBtn = 'p-1.5 rounded hover:bg-navy-700 text-slate-400 hover:text-slate-200 transition cursor-pointer';

    const hasDrift = (id: string): boolean => {
        const runs = lastRuns[id];
        const d = runs != null && runs.length > 0 && runs[0].splDriftDetected;
        return !!d && d !== '0' && d !== 'false';
    };

    return (
        <div className="bg-navy-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-700">
                        <th className={TH}>Name</th>
                        <th className={TH}>App</th>
                        <th className={TH}>Linked Alert</th>
                        <th className={TH}>Schedule</th>
                        <th className={TH}>Last Run</th>
                        <th className={TH}>Status</th>
                        <th className={TH} style={{ width: 28 }}></th>
                        <th className={TH}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {tests.map((t) => {
                        const sb = t.lastRunStatus ? STATUS_BADGE[t.lastRunStatus] : null;
                        const drift = hasDrift(t.id);
                        const isRunning = runningId === t.id;

                        return (
                            <tr key={t.id} className="border-b border-slate-800 hover:bg-navy-800/50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-200">{t.testName}</span>
                                        {!t.enabled && (
                                            <span className="text-[10px] text-slate-600 uppercase">Disabled</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-navy-700 text-slate-300 border border-slate-700">
                                        {t.app || '\u2014'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-slate-400">{t.savedSearchOrigin || '\u2014'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <code className="text-xs text-slate-400 bg-navy-950 px-1.5 py-0.5 rounded">{t.cronSchedule}</code>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-slate-400" title={t.lastRunAt || undefined}>
                                        {relativeTime(t.lastRunAt)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {sb ? (
                                        <span className={'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ' + sb.cls}>
                                            {sb.label}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border bg-slate-700/20 text-slate-500 border-slate-700">
                                            Never
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center" style={{ width: 28 }}>
                                    {drift && <span title="SPL drift detected">&#9888;&#65039;</span>}
                                </td>
                                <td className="px-4 py-3">
                                    {confirmId === t.id ? (
                                        <div className="flex items-center gap-1">
                                            <button className="px-2 py-1 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer transition" onClick={() => { onDelete(t.id); setConfirmId(null); }}>Confirm</button>
                                            <button className="px-2 py-1 rounded text-[11px] font-semibold bg-navy-700 hover:bg-navy-600 text-slate-300 cursor-pointer transition" onClick={() => setConfirmId(null)}>Cancel</button>
                                        </div>
                                    ) : isRunning ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <button className={iconBtn} onClick={() => onRunNow(t.id)} title="Run Now">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </button>
                                            <button className={iconBtn} onClick={() => onEdit(t.id)} title="Edit">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button className={iconBtn} onClick={() => onHistory(t.id)} title="History">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                                            </button>
                                            <button className={iconBtn} onClick={() => setConfirmId(t.id)} title="Delete">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
