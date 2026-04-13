import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { CommandPolicyEntry } from 'core/types/config';
import { Modal } from '../../common';

const SEVERITY_OPTIONS = [
    { value: 'danger', label: '\uD83D\uDD34 Danger', cls: 'text-red-400' },
    { value: 'warning', label: '\uD83D\uDFE1 Warning', cls: 'text-amber-400' },
    { value: 'info', label: '\uD83D\uDD35 Info', cls: 'text-blue-400' },
];

const INPUT_CLS = 'px-2 py-1 text-xs bg-navy-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-blue-300';

const GRID_CLS = [
    'grid items-center gap-3 py-2 px-3 rounded-lg',
    'hover:bg-navy-800/50 group',
    'grid-cols-[80px_100px_120px_1fr_auto_auto]',
].join(' ');

export interface PolicyRowProps {
    entry: CommandPolicyEntry;
    autoFocusLabel?: boolean;
}

export function PolicyRow({ entry, autoFocusLabel = false }: PolicyRowProps) {
    const saveEntry = useTestStore((s) => s.saveCommandPolicyEntry);
    const deleteEntry = useTestStore((s) => s.deleteCommandPolicyEntry);
    const [label, setLabel] = useState(entry.label);
    const [confirmAllow, setConfirmAllow] = useState(false);

    const handleSeverityChange = useCallback((severity: string) => {
        void saveEntry({ ...entry, severity: severity as CommandPolicyEntry['severity'] });
    }, [entry, saveEntry]);

    const handleLabelBlur = useCallback(() => {
        if (label !== entry.label) void saveEntry({ ...entry, label });
    }, [entry, label, saveEntry]);

    const handleToggleAllowed = useCallback(() => {
        if (entry.isDestructive && !entry.allowed) {
            setConfirmAllow(true);
            return;
        }
        void saveEntry({ ...entry, allowed: !entry.allowed });
    }, [entry, saveEntry]);

    const handleConfirmAllow = useCallback(() => {
        void saveEntry({ ...entry, allowed: true });
        setConfirmAllow(false);
    }, [entry, saveEntry]);

    const handleDelete = useCallback(() => {
        void deleteEntry(entry.command);
    }, [entry.command, deleteEntry]);

    return (
        <>
            <div className={GRID_CLS}>
                {/* Badge column — always present for alignment */}
                <span>
                    {entry.isDestructive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400 rounded whitespace-nowrap" title="This command can cause irreversible changes to Splunk data. Enable with caution.">
                            &#9888; Destructive
                        </span>
                    )}
                </span>

                {/* Command name */}
                <span className="text-sm font-mono text-slate-200 truncate">{entry.command}</span>

                {/* Severity */}
                <select
                    value={entry.severity}
                    onChange={(e) => handleSeverityChange(e.target.value)}
                    className={INPUT_CLS + ' w-full cursor-pointer'}
                >
                    {SEVERITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Label */}
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={handleLabelBlur}
                    placeholder="Description..."
                    className={INPUT_CLS + ' w-full min-w-0'}
                    autoFocus={autoFocusLabel}
                />

                {/* Toggle */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                    <input type="checkbox" checked={entry.allowed} onChange={handleToggleAllowed} className="sr-only" />
                    <span className={'relative w-8 h-[18px] rounded-full transition-colors duration-200 ' + (entry.allowed ? 'bg-green-600' : 'bg-red-600')}>
                        <span className={'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-[left] duration-200 ' + (entry.allowed ? 'left-[16px]' : 'left-[2px]')} />
                    </span>
                    <span className={'text-[11px] font-medium w-[52px] ' + (entry.allowed ? 'text-green-400' : 'text-red-400')}>
                        {entry.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                </label>

                {/* Delete */}
                <span className="w-5">
                    {!entry.isDefault && (
                        <button type="button" onClick={handleDelete} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                    )}
                </span>
            </div>

            <Modal open={confirmAllow} title="Allow Destructive Command" onClose={() => setConfirmAllow(false)} onConfirm={handleConfirmAllow} confirmLabel="Allow anyway" variant="danger">
                <p className="text-sm">
                    Warning: <code className="font-mono text-slate-100">{entry.command}</code> can permanently affect your Splunk data.
                    Are you sure you want to allow users to run this command?
                </p>
            </Modal>
        </>
    );
}
