import React, { useState } from 'react';
import { Modal, Button } from '../../common';

export interface SaveTestModalProps {
    open: boolean;
    onClose: () => void;
    initialName: string;
    savedTestId: string | null;
    isSaving: boolean;
    onSaveNew: (name: string, description: string) => void;
    onUpdate: (id: string, name: string, description: string) => void;
}

export function SaveTestModal({
    open, onClose, initialName, savedTestId, isSaving, onSaveNew, onUpdate,
}: SaveTestModalProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState('');
    const [mode, setMode] = useState<'update' | 'new'>(savedTestId ? 'update' : 'new');

    // Reset state when modal opens with new props
    React.useEffect(() => {
        if (open) {
            setName(initialName);
            setDescription('');
            setMode(savedTestId ? 'update' : 'new');
        }
    }, [open, initialName, savedTestId]);

    const handleSave = () => {
        if (mode === 'update' && savedTestId) {
            onUpdate(savedTestId, initialName, '');
        } else {
            if (!name.trim()) return;
            onSaveNew(name.trim(), description.trim());
        }
    };

    const isUpdate = mode === 'update' && savedTestId;

    return (
        <Modal open={open} title={isUpdate ? 'Save Test' : 'Save as New Copy'} onClose={onClose} confirmLabel={isSaving ? 'Saving...' : isUpdate ? 'Save' : 'Save as New'} onConfirm={handleSave}>
            <div className="flex flex-col gap-4">
                {savedTestId && (
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={mode === 'update'} onChange={() => setMode('update')} className="accent-blue-400" />
                            <span className="text-xs text-slate-300">Update existing</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} className="accent-blue-400" />
                            <span className="text-xs text-slate-300">Save as new copy</span>
                        </label>
                    </div>
                )}
                {isUpdate ? (
                    <p className="text-sm text-slate-400">Save changes to <span className="font-semibold text-slate-200">{initialName}</span>?</p>
                ) : (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30"
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                                placeholder="What does this test verify?"
                                maxLength={200}
                                rows={3}
                                className="px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 resize-none"
                            />
                            <span className="text-[10px] text-slate-600 text-right">{description.length}/200</span>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
