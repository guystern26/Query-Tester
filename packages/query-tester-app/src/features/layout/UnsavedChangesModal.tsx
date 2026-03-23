import React from 'react';

export interface UnsavedChangesModalProps {
    onDiscard: () => void;
    onStay: () => void;
}

export function UnsavedChangesModal({ onDiscard, onStay }: UnsavedChangesModalProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-navy-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-fadeIn">
                <h3 className="text-base font-semibold text-slate-100 mb-2">
                    Unsaved changes
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                    You have unsaved changes that will be lost if you leave this page.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onDiscard}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-colors"
                    >
                        Discard & Leave
                    </button>
                    <button
                        type="button"
                        onClick={onStay}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-btnprimary text-white hover:bg-btnprimary-hover cursor-pointer transition-colors"
                    >
                        Stay on Page
                    </button>
                </div>
            </div>
        </div>
    );
}
