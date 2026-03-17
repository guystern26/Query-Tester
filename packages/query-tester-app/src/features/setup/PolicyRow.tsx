import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { CommandPolicyEntry } from 'core/types/config';
import { Modal } from '../../common';

const SEVERITY_OPTIONS = [
    { value: 'danger', label: '\uD83D\uDD34 Danger', cls: 'text-red-400' },
    { value: 'warning', label: '\uD83D\uDFE1 Warning', cls: 'text-amber-400' },
    { value: 'info', label: '\uD83D\uDD35 Info', cls: 'text-blue-400' },
];

const INPUT_CLS = 'px-2 py-1 text-xs bg-navy-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-accent-600';

export interface PolicyRowProps {
    entry: CommandPolicyEntry;
    autoFocusLabel?: boolean;
}

export function PolicyRow({ entry, autoFocusLabel = false }: PolicyRowProps) {
    const saveEntry = useTestStore((s) => s.saveCommandPolicyEntry);
    const deleteEntry = useTestStore((s) => s.deleteCommandPolicyEntry);
    const [label, setLabel] = useState(entry.label);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmAllow, setConfirmAllow] = useState(false);

    const handleSeverityChange = useCallback((severity: string) => {
        void saveEntry({ ...entry, severity: severity as CommandPolicyEntry['severity'] });
    }, [entry, saveEntry]);

    const handleLabelBlur = useCallback(() => {
        if (label !== entry.label) void saveEntry({ ...entry, label });
    }, [entry, label, saveEntry]);

    const handleToggleAllowed = useCallback(() => {
        if (!entry.allowed || !entry.isDestructive) {
            if (entry.isDestructive && !entry.allowed) {
                setConfirmAllow(true);
                return;
            }
            void saveEntry({ ...entry, allowed: !entry.allowed });
        } else {
            void saveEntry({ ...entry, allowed: false });
        }
    }, [entry, saveEntry]);

    const handleConfirmAllow = useCallback(() => {
        void saveEntry({ ...entry, allowed: true });
        setConfirmAllow(false);
    }, [entry, saveEntry]);

    const handleDelete = useCallback(() => {
        void deleteEntry(entry.command);
        setConfirmDelete(false);
    }, [entry.command, deleteEntry]);

    return (
        <>
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-navy-800/50 group">
                {entry.isDestructive && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400 rounded shrink-0" title="This command can cause irreversible changes to Splunk data. Enable with caution.">
                        &#9888; Destructive
                    </span>
                )}
                <span className="text-sm font-mono text-slate-200 min-w-[120px]">{entry.command}</span>
                <select
                    value={entry.severity}
                    onChange={(e) => handleSeverityChange(e.target.value)}
                    className={INPUT_CLS + ' w-[120px] cursor-pointer'}
                >
                    {SEVERITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onBlur={handleLabelBlur}
                    placeholder="Description..."
                    className={INPUT_CLS + ' flex-1 min-w-0'}
                    autoFocus={autoFocusLabel}
                />
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                    <input type="checkbox" checked={entry.allowed} onChange={handleToggleAllowed} className="sr-only" />
                    <span className={'relative w-8 h-[18px] rounded-full transition-colors duration-200 ' + (entry.allowed ? 'bg-green-600' : 'bg-red-600')}>
                        <span className={'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-[left] duration-200 ' + (entry.allowed ? 'left-[16px]' : 'left-[2px]')} />
                    </span>
                    <span className={'text-[11px] font-medium ' + (entry.allowed ? 'text-green-400' : 'text-red-400')}>
                        {entry.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                </label>
                {!entry.isDefault && (
                    <button type="button" onClick={() => setConfirmDelete(true)} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                )}
            </div>

            <Modal open={confirmDelete} title="Remove Command" onClose={() => setConfirmDelete(false)} onConfirm={handleDelete} confirmLabel="Remove" variant="danger">
                <p className="text-sm">Remove <code className="font-mono text-slate-100">{entry.command}</code> from the command policy?</p>
            </Modal>

            <Modal open={confirmAllow} title="Allow Destructive Command" onClose={() => setConfirmAllow(false)} onConfirm={handleConfirmAllow} confirmLabel="Allow anyway" variant="danger">
                <p className="text-sm">
                    Warning: <code className="font-mono text-slate-100">{entry.command}</code> can permanently affect your Splunk data.
                    Are you sure you want to allow users to run this command?
                </p>
            </Modal>
        </>
    );
}
