/**
 * AnalysisPanel — renders analysis notes as a scrollable list.
 * Color-coded by category, with click-to-highlight and "Apply" for suggestions.
 */
import React, { useState, useCallback } from 'react';
import type { AnalysisNote } from '../../api/ideApi';

const COPIED_TIMEOUT_MS = 1500;

/** Category-based colors — each analysis category gets a distinct accent. */
const CATEGORY_STYLES: Record<string, { border: string; dot: string; text: string; bg: string }> = {
    performance:    { border: 'border-purple-500',  dot: 'bg-purple-500',  text: 'text-purple-400',  bg: 'bg-purple-500/8' },
    best_practice:  { border: 'border-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-400',    bg: 'bg-blue-500/8' },
    unused_field:   { border: 'border-amber-500',   dot: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/8' },
    unused_command: { border: 'border-amber-500',   dot: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/8' },
    correctness:    { border: 'border-red-500',     dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-500/8' },
};

/** Fallback: severity-based for unknown categories. */
const SEVERITY_STYLES: Record<string, { border: string; dot: string; text: string; bg: string }> = {
    error:   { border: 'border-red-500',   dot: 'bg-red-500',   text: 'text-red-400',   bg: 'bg-red-500/8' },
    warning: { border: 'border-amber-500', dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/8' },
    info:    { border: 'border-blue-500',  dot: 'bg-blue-500',  text: 'text-blue-400',  bg: 'bg-blue-500/8' },
};

const DEFAULT_STYLE = { border: 'border-slate-500', dot: 'bg-slate-500', text: 'text-slate-400', bg: '' };

function getStyle(note: AnalysisNote): { border: string; dot: string; text: string; bg: string } {
    return CATEGORY_STYLES[note.category] || SEVERITY_STYLES[note.severity] || DEFAULT_STYLE;
}

interface AnalysisPanelProps {
    notes: AnalysisNote[];
    isLoading: boolean;
    onApplySuggestion?: (note: AnalysisNote) => void;
    onClickNote?: (note: AnalysisNote) => void;
}

export function AnalysisPanel({ notes, isLoading, onApplySuggestion, onClickNote }: AnalysisPanelProps): React.ReactElement {
    const errorNotes = notes.filter((n) => n.severity === 'error');
    const warningNotes = notes.filter((n) => n.severity === 'warning');
    const infoNotes = notes.filter((n) => n.severity === 'info');
    const visibleNotes = [...errorNotes, ...warningNotes, ...infoNotes];

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 py-4 px-2 text-[13px] text-slate-400">
                <span className="w-3.5 h-3.5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin shrink-0" />
                Analyzing...
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="py-4 px-2 text-[13px] text-slate-500">
                No analysis notes yet. Click &ldquo;Analyze Query&rdquo; to get started.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Summary badges */}
            <div className="flex items-center gap-2 text-[12px]">
                {errorNotes.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                        {errorNotes.length} error{errorNotes.length !== 1 ? 's' : ''}
                    </span>
                )}
                {warningNotes.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                        {warningNotes.length} warning{warningNotes.length !== 1 ? 's' : ''}
                    </span>
                )}
                {infoNotes.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-navy-700 text-blue-300 font-medium">
                        {infoNotes.length} info
                    </span>
                )}
            </div>

            {/* Note cards */}
            {visibleNotes.map((note) => (
                <NoteCard key={note.id} note={note} onApply={onApplySuggestion} onClick={onClickNote} />
            ))}

        </div>
    );
}

function NoteCard({ note, onApply, onClick }: { note: AnalysisNote; onApply?: (n: AnalysisNote) => void; onClick?: (n: AnalysisNote) => void }): React.ReactElement {
    const style = getStyle(note);
    const [copied, setCopied] = useState(false);
    const hasLine = note.line !== null && note.line !== undefined;

    const handleApply = useCallback(() => {
        if (!note.suggestion) return;
        if (onApply && hasLine) {
            onApply(note);
            return;
        }
        navigator.clipboard.writeText(note.suggestion).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
        }).catch(() => { /* clipboard API unavailable */ });
    }, [note, onApply, hasLine]);

    const handleClick = useCallback(() => {
        if (hasLine && onClick) onClick(note);
    }, [note, onClick, hasLine]);

    return (
        <div
            className={`flex flex-col gap-1 px-2.5 py-2 rounded-md border-l-4 ${style.border} ${style.bg || 'bg-navy-800/60'} ${hasLine ? 'cursor-pointer hover:brightness-125' : ''} transition-all duration-200`}
            onClick={handleClick}
            role={hasLine ? 'button' : undefined}
            tabIndex={hasLine ? 0 : undefined}
        >
            <div className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${style.text}`}>
                            {note.category.replace(/_/g, ' ')}
                        </span>
                        {note.source === 'llm' && (
                            <span className="text-[10px] text-purple-400/60 font-medium">AI</span>
                        )}
                        {hasLine && (
                            <span className={`text-[10px] ${style.text} opacity-60`}>L{note.line}</span>
                        )}
                    </div>
                    <p className="text-[12px] text-slate-300 leading-snug">{note.message}</p>
                </div>
            </div>

            {note.suggestion && (
                <div className="flex items-center gap-2 ml-3.5 mt-0.5">
                    <span className="text-[11px] text-slate-500 flex-1 truncate" title={note.suggestion}>
                        {note.suggestion}
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleApply(); }}
                        className="text-[11px] px-2 py-0.5 rounded bg-navy-700 text-blue-300 hover:bg-blue-500/30 transition cursor-pointer shrink-0"
                    >
                        {copied ? 'Copied!' : (hasLine ? 'Apply' : 'Copy')}
                    </button>
                </div>
            )}
        </div>
    );
}
