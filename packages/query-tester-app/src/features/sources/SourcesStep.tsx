/**
 * SourcesStep — full-width step for reviewing and confirming data source targets.
 * Top: SPL display with auto-detected sources highlighted.
 * Bottom: confirmed sources strip with chips.
 */
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useSourceSpans } from '../../hooks/useSourceSpans';
import { InteractiveSidebar } from '../layout/InteractiveSidebar';
import { SourceChip } from './SourceChip';

interface SourcesStepProps {
    onSourcesChanged?: () => void;
}

export function SourcesStep({ onSourcesChanged }: SourcesStepProps): React.ReactElement | null {
    var test = useTestStore(selectActiveTest);
    var confirmedSources = useTestStore(function (s) { return s.confirmedSources; });
    var setConfirmedSources = useTestStore(function (s) { return s.setConfirmedSources; });
    var addConfirmedSource = useTestStore(function (s) { return s.addConfirmedSource; });
    var removeConfirmedSource = useTestStore(function (s) { return s.removeConfirmedSource; });
    var [manualInput, setManualInput] = useState('');
    var [showManualInput, setShowManualInput] = useState(false);

    var spl = (test && test.query && test.query.spl) || '';
    var llmSources = (test && test.fieldExtraction && test.fieldExtraction.sources) || [];
    var { spans } = useSourceSpans(spl, llmSources);

    // Auto-populate confirmed sources from detected spans on mount (or when spans change)
    var didAutoPopulate = useRef(false);
    useEffect(function () {
        if (didAutoPopulate.current) return;
        if (spans.length === 0) return;
        if (confirmedSources.length > 0) { didAutoPopulate.current = true; return; }
        // Deduplicate spans by rowIdentifier
        var seen = new Set();
        var sources = [];
        for (var i = 0; i < spans.length; i++) {
            var key = spans[i].rowIdentifier.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            sources.push({
                rowIdentifier: spans[i].rowIdentifier,
                fields: spans[i].fields,
                colorIndex: sources.length,
            });
        }
        if (sources.length > 0) {
            setConfirmedSources(sources);
            didAutoPopulate.current = true;
        }
    }, [spans, confirmedSources.length, setConfirmedSources]);

    var handleSourceClick = useCallback(function (ri: string, fields: string[]) {
        var found = false;
        for (var i = 0; i < confirmedSources.length; i++) {
            if (confirmedSources[i].rowIdentifier.toLowerCase() === ri.toLowerCase()) {
                found = true;
                break;
            }
        }
        if (found) {
            removeConfirmedSource(ri);
        } else {
            addConfirmedSource(ri, fields);
        }
        if (onSourcesChanged) onSourcesChanged();
    }, [confirmedSources, addConfirmedSource, removeConfirmedSource, onSourcesChanged]);

    var handleManualAdd = useCallback(function () {
        var trimmed = manualInput.trim();
        if (trimmed.length >= 3) {
            addConfirmedSource(trimmed, []);
            setManualInput('');
            setShowManualInput(false);
            if (onSourcesChanged) onSourcesChanged();
        }
    }, [manualInput, addConfirmedSource, onSourcesChanged]);

    var handleManualKeyDown = useCallback(function (e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleManualAdd();
        if (e.key === 'Escape') { setShowManualInput(false); setManualInput(''); }
    }, [handleManualAdd]);

    if (!test) return null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <div>
                <h3 className="text-[14px] font-semibold text-slate-200 mb-1">
                    Review data sources
                </h3>
                <p className="text-[12px] text-slate-500">
                    We detected the data sources below. Click a highlighted source to dismiss it, or add one manually.
                </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-navy-900 rounded-lg border border-slate-700/30 p-4">
                <InteractiveSidebar spl={spl} onSourceClick={handleSourceClick} />
            </div>

            <div className="shrink-0">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirmed sources ({confirmedSources.length})
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {confirmedSources.map(function (src) {
                        return (
                            <SourceChip
                                key={src.rowIdentifier}
                                rowIdentifier={src.rowIdentifier}
                                fields={src.fields}
                                colorIndex={src.colorIndex}
                                onRemove={function () { removeConfirmedSource(src.rowIdentifier); }}
                            />
                        );
                    })}
                    {showManualInput ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={manualInput}
                                onChange={function (e) { setManualInput(e.target.value); }}
                                onKeyDown={handleManualKeyDown}
                                onBlur={function () { if (!manualInput.trim()) setShowManualInput(false); }}
                                autoFocus
                                placeholder="Type injection target..."
                                className="px-2 py-1 text-[12px] font-mono bg-navy-900 border border-slate-600 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-300 w-[220px]"
                            />
                            <button
                                type="button"
                                onClick={handleManualAdd}
                                disabled={manualInput.trim().length < 3}
                                className="px-2 py-1 text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={function () { setShowManualInput(true); }}
                            className="px-2.5 py-1 rounded-lg border border-dashed border-slate-600 text-[11px] text-slate-400 hover:text-blue-300 hover:border-blue-300/40 cursor-pointer transition-colors"
                        >
                            + Add manually
                        </button>
                    )}
                    {confirmedSources.length === 0 && !showManualInput && (
                        <span className="text-[11px] text-slate-600 italic ml-1">
                            No sources selected — click highlighted text above or add manually
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
