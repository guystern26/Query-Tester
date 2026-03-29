/**
 * AiResultsCard — Collapsible card showing AI analysis of query results.
 * Rendered inside the IDE results panel when aiNotes are present.
 */
import React, { useState, useCallback } from 'react';

const SEVERITY_STYLES: Record<string, { border: string; dot: string; text: string }> = {
    error:   { border: 'border-red-500',   dot: 'bg-red-500',   text: 'text-red-400' },
    warning: { border: 'border-amber-500', dot: 'bg-amber-500', text: 'text-amber-400' },
    info:    { border: 'border-blue-500',  dot: 'bg-blue-500',  text: 'text-blue-400' },
};

const DEFAULT_STYLE = { border: 'border-slate-500', dot: 'bg-slate-500', text: 'text-slate-400' };

interface AiNote {
    id: string;
    severity: string;
    category: string;
    message: string;
    suggestion: string | null;
}

interface AiResultsCardProps {
    notes: AiNote[];
}

export function AiResultsCard({ notes }: AiResultsCardProps): React.ReactElement | null {
    const [collapsed, setCollapsed] = useState(false);

    const toggle = useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []);

    if (notes.length === 0) return null;

    return (
        <div className="rounded-lg border border-slate-700 bg-navy-900/60 overflow-hidden">
            <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-navy-800/40 transition-colors"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-purple-400 shrink-0">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="text-[13px] font-semibold text-slate-200 flex-1">
                    AI Analysis
                </span>
                <span className="text-[11px] text-slate-500">
                    {notes.length} note{notes.length !== 1 ? 's' : ''}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-slate-500 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            {!collapsed && (
                <div className="flex flex-col gap-2 px-3 pb-3">
                    {notes.map((note) => {
                        const style = SEVERITY_STYLES[note.severity] || DEFAULT_STYLE;
                        return (
                            <div key={note.id} className={`flex flex-col gap-1 px-2.5 py-2 rounded-md border-l-4 ${style.border} bg-navy-800/60`}>
                                <div className="flex items-start gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>
                                            {note.category.replace(/_/g, ' ')}
                                        </span>
                                        <p className="text-[12px] text-slate-300 leading-snug mt-0.5">
                                            {note.message}
                                        </p>
                                    </div>
                                </div>
                                {note.suggestion && (
                                    <div className="ml-3.5 mt-0.5">
                                        <span className="text-[11px] text-slate-500" title={note.suggestion}>
                                            {note.suggestion}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
