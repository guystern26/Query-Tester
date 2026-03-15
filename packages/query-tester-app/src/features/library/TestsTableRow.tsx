import React, { useState } from 'react';
import type { SavedTestMeta, ScheduledTest } from 'core/types';

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
    standard: { label: 'Standard', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    query_only: { label: 'Query Only', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    ijump_alert: { label: 'iJump', cls: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
};

function relativeTime(iso: string): string {
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

export interface TestsTableRowProps {
    test: SavedTestMeta;
    schedule: ScheduledTest | null;
    isLoading: boolean;
    onOpen: (id: string) => void;
    onEdit: (id: string) => void;
    onSchedule: (id: string) => void;
    onHistory: (id: string) => void;
    onToggleSchedule: (scheduleId: string, enabled: boolean) => void;
    onDelete: (id: string) => void;
    deleteError: string | null;
}

export function TestsTableRow({
    test, schedule, isLoading, onOpen, onEdit, onSchedule, onHistory, onToggleSchedule, onDelete, deleteError,
}: TestsTableRowProps) {
    const [confirming, setConfirming] = useState(false);
    const badge = TYPE_BADGE[test.validationType] || TYPE_BADGE[test.testType] || TYPE_BADGE.standard;

    const handleRowClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-action]')) return;
        onOpen(test.id);
    };

    // Backend stores enabled as "1"/"0" string; normalize to boolean
    const isEnabled = schedule ? (schedule.enabled === true || schedule.enabled as unknown === '1') : false;
    const iconBtn = 'p-1.5 rounded hover:bg-navy-700 text-slate-400 hover:text-slate-200 transition cursor-pointer';

    const handleClockClick = () => {
        if (schedule) {
            // Toggle enable/disable directly
            onToggleSchedule(schedule.id, !isEnabled);
        } else {
            // No schedule yet — open schedule modal to create one
            onSchedule(test.id);
        }
    };

    return (
        <tr onClick={handleRowClick} className="border-b border-slate-800 hover:bg-navy-800/50 cursor-pointer transition-colors">
            <td className="px-4 py-3">
                <span className="text-sm font-semibold text-slate-200">{test.name}</span>
            </td>
            <td className="px-4 py-3 max-w-[200px]">
                <span className="text-xs text-slate-500 truncate block">{test.description || '\u2014'}</span>
            </td>
            <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-navy-700 text-slate-300 border border-slate-700">{test.app || '\u2014'}</span>
            </td>
            <td className="px-4 py-3">
                <span className={'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ' + badge.cls}>{badge.label}</span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className="text-xs text-slate-400">{test.scenarioCount}</span>
            </td>
            <td className="px-4 py-3">
                {schedule ? (
                    <div className="flex items-center gap-1.5" data-action="true">
                        <code className="text-[11px] text-slate-400 font-mono">{schedule.cronSchedule}</code>
                        <span className={'text-[10px] font-medium ' + (isEnabled ? 'text-green-400' : 'text-slate-600')}>
                            {isEnabled ? 'On' : 'Off'}
                        </span>
                    </div>
                ) : (
                    <span className="text-[11px] text-slate-600">&mdash;</span>
                )}
            </td>
            <td className="px-4 py-3">
                <span className="text-xs text-slate-400">{test.createdBy}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs text-slate-400" title={test.updatedAt}>{relativeTime(test.updatedAt)}</span>
            </td>
            <td className="px-4 py-3">
                {isLoading ? (
                    <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                    </div>
                ) : confirming ? (
                    <div className="flex items-center gap-1" data-action="true">
                        {deleteError && <span className="text-[10px] text-red-400 mr-1">{deleteError}</span>}
                        <button className="px-2 py-1 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer transition" onClick={() => { onDelete(test.id); setConfirming(false); }}>Confirm</button>
                        <button className="px-2 py-1 rounded text-[11px] font-semibold bg-navy-700 hover:bg-navy-600 text-slate-300 cursor-pointer transition" onClick={() => setConfirming(false)}>Cancel</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1" data-action="true">
                        {/* Clock = toggle enabled/disabled (or create schedule if none) */}
                        <button
                            className={iconBtn}
                            onClick={handleClockClick}
                            title={schedule ? (isEnabled ? 'Disable schedule' : 'Enable schedule') : 'Create schedule'}
                        >
                            <svg className={'w-4 h-4 transition-colors ' + (isEnabled ? 'text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                        </button>
                        {/* Gear = edit schedule settings (cron, alerts) */}
                        <button className={iconBtn} onClick={() => onSchedule(test.id)} title={schedule ? 'Edit schedule settings' : 'Create schedule'}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        {/* History = rounded arrow (former runs) */}
                        <button className={iconBtn} onClick={() => onHistory(test.id)} title="Run history">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 1 1 1.34 4.41" /></svg>
                        </button>
                        {/* Delete */}
                        <button className={iconBtn} onClick={() => setConfirming(true)} title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}
