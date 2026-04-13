/** IdeResultsBar — Results display for the SPL IDE mode. */
import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { IdeResultsTable } from './IdeResultsTable';
import { findDangerousCommands } from '../query/ideCommandPolicy';
import { DangerousCommandModal } from '../ide/DangerousCommandModal';

function Chevron({ up }: { up: boolean }): React.ReactElement {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${up ? '' : 'rotate-180'}`}>
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

function buildAnalysisSummary(notes: Array<{ severity: string }>): string {
    const e = notes.filter((n) => n.severity === 'error').length;
    const w = notes.filter((n) => n.severity === 'warning').length;
    const i = notes.filter((n) => n.severity === 'info').length;
    const p: string[] = [];
    if (e) p.push(e + ' error' + (e !== 1 ? 's' : ''));
    if (w) p.push(w + ' warning' + (w !== 1 ? 's' : ''));
    if (i) p.push(i + ' info');
    return p.length > 0 ? p.join(', ') : 'no issues found';
}

export function IdeResultsBar(): React.ReactElement {
    const test = useTestStore(selectActiveTest);
    const ideResponse = useTestStore((s) => s.ideResponse);
    const ideRunning = useTestStore((s) => s.ideRunning);
    const expanded = useTestStore((s) => s.resultsBarExpanded);
    const toggleResultsBar = useTestStore((s) => s.toggleResultsBar);
    const runIdeQuery = useTestStore((s) => s.runIdeQuery);
    const cancelIdeRun = useTestStore((s) => s.cancelIdeRun);
    const ideUserContext = useTestStore((s) => s.ideUserContext);
    const analysisNotes = useTestStore((s) => s.analysisNotes);
    const [dangerousCommands, setDangerousCommands] = useState<string[]>([]);

    const app = test?.app ?? '';
    const spl = test?.query?.spl ?? '';
    const timeRange = test?.query?.timeRange;
    const errors = ideResponse?.errors ?? [];
    const warnings = ideResponse?.warnings ?? [];
    const analysis = ideResponse?.splAnalysis;
    const aiNotes = ideResponse?.aiNotes ?? [];

    let status: React.ReactNode;
    if (ideRunning) {
        status = (<><span className="w-3.5 h-3.5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin shrink-0" /><span className="text-blue-300">Running query...</span></>);
    } else if (ideResponse) {
        if (ideResponse.status === 'error') {
            status = (<><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-400">{ideResponse.message || 'Query failed'}</span></>);
        } else {
            status = (<><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /><span className="text-green-400">{ideResponse.resultCount} result{ideResponse.resultCount !== 1 ? 's' : ''} in {ideResponse.executionTimeMs}ms</span></>);
        }
    } else {
        status = <span className="text-slate-400">Ready to run</span>;
    }

    const executeQuery = useCallback(() => {
        if (!test || !spl.trim()) return;
        const tr = timeRange ? { earliest: timeRange.earliest || '0', latest: timeRange.latest || 'now' } : undefined;
        const prior = analysisNotes.map((n) => ({ severity: n.severity, category: n.category, message: n.message }));
        void runIdeQuery(spl, app, tr, ideUserContext || undefined, prior.length > 0 ? prior : undefined, true);
    }, [test, spl, app, timeRange, analysisNotes, ideUserContext, runIdeQuery]);

    const handleRun = useCallback((): void => {
        if (!test) return;
        if (ideRunning) { cancelIdeRun(); return; }
        if (!spl.trim()) return;
        const dangerous = findDangerousCommands(spl);
        if (dangerous.length > 0) { setDangerousCommands(dangerous); return; }
        executeQuery();
    }, [test, ideRunning, spl, cancelIdeRun, executeQuery]);

    const handleConfirmDangerous = useCallback(() => {
        setDangerousCommands([]);
        executeQuery();
    }, [executeQuery]);

    let btnLabel: string;
    let btnCls: string;
    if (ideRunning) { btnLabel = 'Cancel'; btnCls = 'bg-red-500 hover:bg-red-600 text-white'; }
    else if (ideResponse) { btnLabel = 'Rerun'; btnCls = 'bg-blue-300 hover:bg-blue-200 text-slate-900'; }
    else { btnLabel = 'Run Query'; btnCls = 'bg-green-500 hover:bg-green-600 text-white'; }

    const hasAnalysis = analysisNotes.length > 0 || aiNotes.length > 0;

    return (
        <>
        {dangerousCommands.length > 0 && (
            <DangerousCommandModal commands={dangerousCommands} onConfirm={handleConfirmDangerous} onCancel={() => setDangerousCommands([])} />
        )}
        <div className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col overflow-hidden transition-all duration-300 ease-out" style={{ height: expanded ? '45vh' : '48px' }}>
            <div className="h-12 shrink-0 flex items-center justify-between px-5 bg-navy-900 border-t border-slate-600/30 shadow-[0_-1px_4px_rgba(0,0,0,0.4)] cursor-pointer select-none" onClick={toggleResultsBar}>
                <div className="flex items-center gap-2 text-[13px]">{status}</div>
                <div className="flex items-center gap-2">
                    <Chevron up={!expanded} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRun(); }} disabled={!ideRunning && !spl.trim()}
                        className={`px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-colors duration-300 border-none disabled:opacity-40 disabled:cursor-not-allowed ${btnCls}`}>
                        {btnLabel}
                    </button>
                </div>
            </div>

            <div className={`flex-1 min-h-0 overflow-y-auto bg-navy-950 p-4 transition-opacity duration-200 ${expanded ? 'opacity-100 delay-150' : 'opacity-0'}`}>
                <div className="flex flex-col gap-3">
                    {/* Results table — first, at the top */}
                    {ideResponse && ideResponse.status === 'success' && (
                        ideResponse.resultCount === 0
                            ? <div className="py-6 text-center text-slate-500 text-[13px]">Query returned 0 results. Try adjusting your time range or search criteria.</div>
                            : <IdeResultsTable rows={ideResponse.resultRows} totalCount={ideResponse.resultCount} />
                    )}
                    {!ideResponse && !ideRunning && (
                        <div className="py-6 text-center text-slate-500 text-[13px]">
                            {spl.trim() ? 'Press Ctrl+Enter or click Run Query to execute.' : 'Enter an SPL query above to get started.'}
                        </div>
                    )}

                    {/* Errors and warnings */}
                    {analysis && analysis.unauthorizedCommands.length > 0 && (
                        <div className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-300">
                            <strong>Blocked commands:</strong> {analysis.unauthorizedCommands.join(', ')}
                        </div>
                    )}
                    {errors.map((e, i) => (
                        <div key={'e' + i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">{e.message}</div>
                    ))}
                    {warnings.map((w, i) => (
                        <div key={'w' + i} className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-navy-800 text-[13px] text-slate-200">{w.message}</div>
                    ))}

                    {/* Analysis summary + AI notes — below results */}
                    {ideResponse && hasAnalysis && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-navy-800/60 border border-slate-700/50 text-[13px]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span className="text-slate-300">Analysis: {buildAnalysisSummary(analysisNotes)}</span>
                            {aiNotes.length > 0 && <span className="text-slate-500">+ {aiNotes.length} result note{aiNotes.length !== 1 ? 's' : ''}</span>}
                        </div>
                    )}
                    {aiNotes.length > 0 && aiNotes.map((note) => (
                        <div key={note.id} className="flex items-start gap-2 px-3 py-1.5 text-[12px] text-slate-400">
                            <span className="text-purple-400/70 mt-0.5 shrink-0">&#8226;</span>
                            <span>{note.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </>
    );
}
