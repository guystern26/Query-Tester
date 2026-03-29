/**
 * DangerousCommandModal — Warns the user before running SPL with side-effect commands.
 * Shows which commands were detected and asks for explicit confirmation.
 */
import React from 'react';

interface DangerousCommandModalProps {
    commands: string[];
    onConfirm: () => void;
    onCancel: () => void;
}

export function DangerousCommandModal({ commands, onConfirm, onCancel }: DangerousCommandModalProps): React.ReactElement {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 animate-fadeIn">
            <div className="bg-navy-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-200">Side-effect commands detected</h3>
                        <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">
                            This query contains commands that may modify data in Splunk:
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5 px-2">
                    {commands.map((cmd) => (
                        <span key={cmd} className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[13px] font-mono font-medium">
                            {cmd}
                        </span>
                    ))}
                </div>

                <p className="text-[12px] text-slate-500 leading-relaxed px-2">
                    Are you sure you want to run this query? This is equivalent to running it in the Splunk search bar.
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onClick={onCancel}
                        className="px-4 py-2 text-[13px] font-medium rounded-lg bg-navy-800 border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 cursor-pointer transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm}
                        className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 cursor-pointer transition-colors">
                        Run Anyway
                    </button>
                </div>
            </div>
        </div>
    );
}
