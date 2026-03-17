import React, { useState, useCallback, useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { CommandPolicyEntry } from 'core/types/config';
import { DESTRUCTIVE_COMMANDS } from 'core/constants/commandPolicy';
import { Modal } from '../../common';
import { PolicyRow } from './PolicyRow';

export function CommandPolicySection() {
    const commandPolicy = useTestStore((s) => s.commandPolicy);
    const savePolicy = useTestStore((s) => s.saveCommandPolicy);
    const saveEntry = useTestStore((s) => s.saveCommandPolicyEntry);
    const fetchPolicy = useTestStore((s) => s.fetchCommandPolicy);
    const [resetOpen, setResetOpen] = useState(false);
    const [addingCommand, setAddingCommand] = useState(false);
    const [newCommand, setNewCommand] = useState('');
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);

    const builtIn = useMemo(() => commandPolicy.filter((e) => e.isDefault), [commandPolicy]);
    const custom = useMemo(() => commandPolicy.filter((e) => !e.isDefault), [commandPolicy]);

    const handleReset = useCallback(async () => {
        await savePolicy([]);
        await fetchPolicy();
        setResetOpen(false);
    }, [savePolicy, fetchPolicy]);

    const handleAddCommand = useCallback(async () => {
        const cmd = newCommand.trim().toLowerCase().replace(/\s+/g, '');
        if (!cmd) return;
        if (commandPolicy.some((e) => e.command === cmd)) return;
        const entry: CommandPolicyEntry = {
            id: crypto.randomUUID(),
            command: cmd,
            severity: 'warning',
            label: '',
            allowed: true,
            isDefault: false,
            isDestructive: DESTRUCTIVE_COMMANDS.includes(cmd),
        };
        await saveEntry(entry);
        setLastAddedId(entry.id);
        setNewCommand('');
        setAddingCommand(false);
    }, [newCommand, commandPolicy, saveEntry]);

    return (
        <section className="border border-slate-700 rounded-lg bg-navy-900 p-5">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-200">SPL Command Policy</h2>
                <button type="button" onClick={() => setResetOpen(true)} className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer">
                    Reset to defaults
                </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
                Control which SPL commands are highlighted in the editor and whether they are permitted to run.
            </p>

            {/* Built-in Commands */}
            <div className="mb-4">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Built-in Commands</div>
                <p className="text-[11px] text-slate-500 mb-2">Built-in commands can be configured but not removed.</p>
                <div className="flex flex-col gap-0.5">
                    {builtIn.map((e) => <PolicyRow key={e.command} entry={e} />)}
                </div>
            </div>

            {/* Additional Commands */}
            <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Additional Commands</div>
                {custom.length === 0 && !addingCommand && (
                    <p className="text-[11px] text-slate-500 mb-2">No additional commands configured.</p>
                )}
                <div className="flex flex-col gap-0.5">
                    {custom.map((e) => (
                        <PolicyRow key={e.command} entry={e} autoFocusLabel={e.id === lastAddedId} />
                    ))}
                </div>
                {addingCommand ? (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            value={newCommand}
                            onChange={(e) => setNewCommand(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            placeholder="command name"
                            className="px-2 py-1.5 text-xs font-mono bg-navy-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-accent-600 w-[180px]"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') void handleAddCommand(); if (e.key === 'Escape') setAddingCommand(false); }}
                        />
                        <button type="button" onClick={() => void handleAddCommand()} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white cursor-pointer">Add</button>
                        <button type="button" onClick={() => setAddingCommand(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">Cancel</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setAddingCommand(true)} className="mt-2 text-xs text-accent-400 hover:text-accent-300 font-semibold cursor-pointer">
                        + Add Command
                    </button>
                )}
            </div>

            <Modal open={resetOpen} title="Reset Command Policy" onClose={() => setResetOpen(false)} onConfirm={handleReset} confirmLabel="Reset" variant="danger">
                <p className="text-sm">This will reset all command rules to built-in defaults. Custom commands will be removed.</p>
            </Modal>
        </section>
    );
}
