/**
 * QuerySidebar — resizable, collapsible sidebar showing SPL + metadata.
 * Visible on Data and Validation steps.
 */
import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useInjectionRanges } from '../../hooks/useInjectionRanges';
import { renderHighlightedSpl } from './splHighlight';

interface QuerySidebarProps {
    collapsed: boolean;
    width: number;
    onToggle: () => void;
    onResize: (width: number) => void;
    onEditClick: () => void;
}

function CollapsedSidebar({ onToggle, spl }: { onToggle: () => void; spl: string }): React.ReactElement {
    var firstLine = (spl || '').split('\n')[0] || '';
    if (firstLine.length > 40) firstLine = firstLine.slice(0, 38) + '...';
    return (
        <div
            className="w-[28px] bg-navy-800 border border-slate-700/20 rounded-l-xl flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-navy-700/60 hover:border-blue-300/30 transition-all group"
            onClick={onToggle}
            title="Expand query sidebar"
        >
            <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                className="text-[10px] text-slate-400 group-hover:text-blue-300 font-semibold tracking-[1px] mt-2 transition-colors">
                SPL
            </div>
            <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-300 mt-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </div>
    );
}

export function QuerySidebar({ collapsed, width, onToggle, onResize, onEditClick }: QuerySidebarProps): React.ReactElement {
    var test = useTestStore(selectActiveTest);
    var spl = (test && test.query && test.query.spl) || '';
    var origin = (test && test.query && test.query.savedSearchOrigin) || '';
    var timeRange = (test && test.query) ? test.query.timeRange : null;
    var { ranges } = useInjectionRanges();

    var fieldNames = useMemo(function (): string[] {
        if (!test || !test.fieldExtraction || !test.fieldExtraction.sources) return [];
        var fields: string[] = [];
        var sources = test.fieldExtraction.sources;
        for (var i = 0; i < sources.length; i++) {
            var ds = sources[i];
            if (ds.fields) {
                for (var j = 0; j < ds.fields.length; j++) {
                    if (fields.indexOf(ds.fields[j]) === -1) {
                        fields.push(ds.fields[j]);
                    }
                }
            }
        }
        return fields;
    }, [test]);

    var dragRef = useRef<{ startX: number; startW: number } | null>(null);

    var COLLAPSE_THRESHOLD = 120;

    var handleMouseDown = useCallback(function (e: React.MouseEvent) {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startW: width };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [width]);

    useEffect(function () {
        function handleMouseMove(e: MouseEvent) {
            if (!dragRef.current) return;
            var newW = dragRef.current.startW + (e.clientX - dragRef.current.startX);
            if (newW < COLLAPSE_THRESHOLD) {
                dragRef.current = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                onToggle();
                return;
            }
            onResize(newW);
        }
        function handleMouseUp() {
            if (!dragRef.current) return;
            dragRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return function () {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [onResize, onToggle]);

    var trLabel = '';
    if (timeRange) {
        trLabel = timeRange.label || ((timeRange.earliest || '') + ' to ' + (timeRange.latest || ''));
    }

    if (collapsed) {
        return <CollapsedSidebar onToggle={onToggle} spl={spl} />;
    }

    return (
        <React.Fragment>
            <div
                data-tutorial="query-sidebar"
                className="bg-navy-800 border border-slate-700/20 rounded-l-xl flex flex-col shrink-0 overflow-hidden"
                style={{ width: width + 'px', minWidth: '180px' }}
            >
                <div className="px-3 py-2.5 border-b border-slate-700/30 flex items-center justify-between shrink-0">
                    <span className="text-[13px] font-bold text-slate-200">Query</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onEditClick}
                            className="text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer transition-colors">
                            edit
                        </button>
                        <button type="button" onClick={onToggle}
                            className="bg-slate-700 text-slate-400 w-6 h-6 rounded flex items-center justify-center text-sm hover:text-slate-200 cursor-pointer transition-colors"
                            title="Collapse sidebar">
                            {'\u00AB'}
                        </button>
                    </div>
                </div>

                <div className="px-3 py-3 flex-1 overflow-y-auto min-h-0">
                    <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                        {renderHighlightedSpl(spl, ranges)}
                    </pre>

                    <div className="mt-4 pt-3 border-t border-slate-700/30 flex flex-col gap-3">
                        {origin ? (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Saved Search</div>
                                <div className="text-[12px] text-slate-400">{origin}</div>
                            </div>
                        ) : null}
                        {trLabel ? (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Time Range</div>
                                <div className="text-[12px] text-slate-400">{trLabel}</div>
                            </div>
                        ) : null}
                        {fieldNames.length > 0 ? (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fields</div>
                                <div className="flex flex-wrap gap-1">
                                    {fieldNames.map(function (f) {
                                        return (
                                            <span key={f} className="bg-navy-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-blue-300 font-mono">
                                                {f}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            <div
                className="w-[8px] bg-navy-700/50 hover:bg-blue-300/30 cursor-col-resize flex items-center justify-center shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="w-[2px] h-10 bg-slate-600 rounded" />
            </div>
        </React.Fragment>
    );
}
