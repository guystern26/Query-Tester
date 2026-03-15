import React, { useState } from 'react';
import type { SavedTestMeta, ScheduledTest } from 'core/types';
import { relativeTime, normalizeEnabled } from '../../utils/formatters';

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
    pass: { dot: 'bg-green-400', text: 'text-green-400', label: 'Pass' },
    fail: { dot: 'bg-red-400', text: 'text-red-400', label: 'Fail' },
    partial: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Partial' },
    error: { dot: 'bg-red-600', text: 'text-red-500', label: 'Error' },
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
    standard: { label: 'Standard', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    query_only: { label: 'Query Only', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    ijump_alert: { label: 'iJump', cls: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
};

const ICON_BTN_CLS = 'p-1.5 rounded hover:bg-navy-700 text-slate-400 hover:text-slate-200 transition cursor-pointer';

export interface TestsTableRowProps {
    test: SavedTestMeta;
    schedule: ScheduledTest | null;
    isLoading: boolean;
    isToggling: boolean;
    isCreatingSchedule: boolean;
    onOpen: (id: string) => void;
    onEdit: (id: string) => void;
    onSchedule: (id: string) => void;
    onHistory: (id: string) => void;
    onToggleSchedule: (scheduleId: string, enabled: boolean) => void;
    onDelete: (id: string) => void;
    deleteError: string | null;
}

export function TestsTableRow({
    test, schedule, isLoading, isToggling, isCreatingSchedule, onOpen, onEdit, onSchedule, onHistory, onToggleSchedule, onDelete, deleteError,
}: TestsTableRowProps) {
    const [isConfirming, setIsConfirming] = useState(false);
    const badge = TYPE_BADGE[test.validationType] || TYPE_BADGE[test.testType] || TYPE_BADGE.standard;
    const isEnabled = schedule ? normalizeEnabled(schedule.enabled) : false;

    const handleRowClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-action]')) return;
        onOpen(test.id);
    };

    const handleClockClick = () => {
        if (schedule) {
            onToggleSchedule(schedule.id, !isEnabled);
        } else {
            onSchedule(test.id);
        }
    };

    const handleConfirmDelete = () => {
        onDelete(test.id);
        setIsConfirming(false);
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
                {isCreatingSchedule ? (
                    <div className="flex items-center gap-1.5" data-action="true">
                        <div className="w-3 h-3 border-[1.5px] border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                        <span className="text-[10px] text-slate-500">Creating schedule...</span>
                    </div>
                ) : schedule ? (
                    <div className="flex items-center gap-1.5" data-action="true">
                        {isToggling ? (
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 border-[1.5px] border-slate-600 border-t-blue-400 rounded-full animate-spin" />
                                <span className="text-[10px] text-slate-500">Updating...</span>
                            </div>
                        ) : (
                            <>
                                <code className={'text-[11px] font-mono ' + (isEnabled ? 'text-slate-400' : 'text-slate-600')}>{schedule.cronSchedule}</code>
                                <span className={'text-[10px] font-medium ' + (isEnabled ? 'text-green-400' : 'text-slate-600')}>
                                    {isEnabled ? 'On' : 'Off'}
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    <span className="text-[11px] text-slate-600">&mdash;</span>
                )}
            </td>
            <td className="px-4 py-3">
                {schedule && schedule.lastRunAt ? (
                    <div className="flex items-center gap-1.5">
                        <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + (STATUS_STYLES[schedule.lastRunStatus || '']?.dot || 'bg-slate-600')} />
                        <span className={'text-[11px] font-medium ' + (STATUS_STYLES[schedule.lastRunStatus || '']?.text || 'text-slate-500')}>
                            {STATUS_STYLES[schedule.lastRunStatus || '']?.label || schedule.lastRunStatus || '—'}
                        </span>
                        <span className="text-[10px] text-slate-500" title={schedule.lastRunAt}>{relativeTime(schedule.lastRunAt)}</span>
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
                ) : isConfirming ? (
                    <div className="flex items-center gap-1" data-action="true">
                        {deleteError && <span className="text-[10px] text-red-400 mr-1">{deleteError}</span>}
                        <button className="px-2 py-1 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white cursor-pointer transition" onClick={handleConfirmDelete}>Confirm</button>
                        <button className="px-2 py-1 rounded text-[11px] font-semibold bg-navy-700 hover:bg-navy-600 text-slate-300 cursor-pointer transition" onClick={() => setIsConfirming(false)}>Cancel</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1" data-action="true">
                        <button
                            className={ICON_BTN_CLS + (!schedule ? ' animate-pulse' : '')}
                            onClick={handleClockClick}
                            title={schedule ? (isEnabled ? 'Disable schedule' : 'Click to enable schedule') : 'Create schedule'}
                        >
                            <svg className={'w-4 h-4 transition-colors ' + (
                                !schedule
                                    ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]'
                                    : isEnabled
                                        ? 'text-green-400 drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]'
                                        : 'text-slate-600 hover:text-amber-400'
                            )} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                        </button>
                        <button className={ICON_BTN_CLS} onClick={() => onSchedule(test.id)} title={schedule ? 'Edit schedule settings' : 'Create schedule'}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button className={ICON_BTN_CLS} onClick={() => onHistory(test.id)} title="Run history">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 1 1 1.34 4.41" /></svg>
                        </button>
                        <button className={ICON_BTN_CLS} onClick={() => setIsConfirming(true)} title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}
