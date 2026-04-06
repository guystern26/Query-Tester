/**
 * AnalysisResultBar — renders below the editor when LLM analysis completes.
 * Shows explanation, field legend with color dots, and color-coded notes.
 */
import React from 'react';
import type { AnalyzeQueryNote } from '../../api/llmApi';
import type { TrackedField } from './useAnalyzeQuery';
import { getFieldColor } from './fieldTrackingColors';

/** Category-to-color mapping for note badges. */
const NOTE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    performance:   { bg: 'bg-amber-900/30',  text: 'text-amber-300',  border: 'border-amber-700/40' },
    best_practice: { bg: 'bg-blue-900/30',   text: 'text-blue-300',   border: 'border-blue-700/40' },
    correctness:   { bg: 'bg-red-900/30',    text: 'text-red-300',    border: 'border-red-700/40' },
    unused_field:  { bg: 'bg-slate-800/50',  text: 'text-slate-400',  border: 'border-slate-600/40' },
    unused_command:{ bg: 'bg-purple-900/30', text: 'text-purple-300', border: 'border-purple-700/40' },
};
const DEFAULT_NOTE_COLOR = { bg: 'bg-slate-800/50', text: 'text-slate-300', border: 'border-slate-600/40' };

function getNoteColor(category: string): typeof DEFAULT_NOTE_COLOR {
    return NOTE_COLORS[category] || DEFAULT_NOTE_COLOR;
}

interface AnalysisResultBarProps {
    explanation: string;
    trackedFields: TrackedField[];
    analysisSummary: string;
    unmatchedNotes: AnalyzeQueryNote[];
    analysisError: string;
    onClear: () => void;
}

export function AnalysisResultBar({
    explanation,
    trackedFields,
    analysisSummary,
    unmatchedNotes,
    analysisError,
    onClear,
}: AnalysisResultBarProps): React.ReactElement | null {
    if (!explanation && !analysisSummary && !analysisError) return null;

    return (
        <div className="flex flex-col gap-2 mt-2 text-[13px]">
            {analysisError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300">
                    <span className="flex-1">{analysisError}</span>
                    <ClearButton onClick={onClear} />
                </div>
            )}

            {explanation && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-navy-800/60 border border-slate-700/50 text-slate-200">
                    <LightbulbIcon />
                    <span className="flex-1 leading-relaxed">{explanation}</span>
                    <ClearButton onClick={onClear} />
                </div>
            )}

            {trackedFields.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1.5 flex-wrap">
                    <span className="text-slate-400 text-[12px] mr-1">Fields:</span>
                    {trackedFields.map((f) => {
                        const color = getFieldColor(f.colorIndex);
                        return (
                            <span
                                key={f.name + '-' + f.colorIndex}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[12px] text-slate-300 bg-slate-800/50"
                            >
                                <span className={'w-2 h-2 rounded-full ' + color.dot} aria-hidden="true" />
                                {f.name}
                            </span>
                        );
                    })}
                </div>
            )}

            {analysisSummary && (
                <div className="px-3 py-1.5 text-slate-400 text-[12px]">{analysisSummary}</div>
            )}

            {unmatchedNotes.length > 0 && (
                <div className="flex flex-col gap-1.5 px-3 py-1.5">
                    <span className="text-slate-500 text-[12px]">
                        {unmatchedNotes.length} note(s) could not be mapped to exact positions:
                    </span>
                    {unmatchedNotes.map((n, i) => (
                        <NoteCard key={i} category={n.category} message={n.message} />
                    ))}
                </div>
            )}
        </div>
    );
}

function NoteCard({ category, message }: { category: string; message: string }): React.ReactElement {
    const c = getNoteColor(category);
    return (
        <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md border ${c.bg} ${c.border}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${c.text} whitespace-nowrap mt-px`}>
                {category.replace('_', ' ')}
            </span>
            <span className="text-[12px] text-slate-300 leading-snug">{message}</span>
        </div>
    );
}

function ClearButton({ onClick }: { onClick: () => void }): React.ReactElement {
    return (
        <button
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition cursor-pointer"
            onClick={onClick}
            title="Clear analysis"
        >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
}

export function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): React.ReactElement {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition cursor-pointer border ${active ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-400'}`}
        >
            {label}
        </button>
    );
}

function LightbulbIcon(): React.ReactElement {
    return (
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
    );
}
