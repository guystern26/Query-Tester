import React from 'react';

export interface UnsavedChangesModalProps {
    onDiscard: () => void;
    onStay: () => void;
    onSave?: () => void;
    isSaving?: boolean;
}

export function UnsavedChangesModal({ onDiscard, onStay, onSave, isSaving }: UnsavedChangesModalProps): React.ReactElement {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-navy-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-fadeIn">
                <h3 className="text-base font-semibold text-slate-100 mb-2">
                    Unsaved changes
                </h3>
                <p className="text-sm text-slate-400 mb-2">
                    You have unsaved changes that will be lost if you leave this page.
                </p>
                {onSave && (
                    <p className="text-xs text-slate-500 mb-6">
                        If you choose to save, the test will be waiting for you at the builder and you will be able to continue editing it afterwards.
                    </p>
                )}
                {!onSave && <div className="mb-4" />}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-colors disabled:opacity-40"
                    >
                        Discard & Leave
                    </button>
                    <button
                        type="button"
                        onClick={onStay}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-navy-800 cursor-pointer transition-colors disabled:opacity-40"
                    >
                        Stay on Page
                    </button>
                    {onSave && (
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-btnprimary text-white hover:bg-btnprimary-hover cursor-pointer transition-colors disabled:opacity-40"
                        >
                            {isSaving ? 'Saving...' : 'Save & Leave'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
