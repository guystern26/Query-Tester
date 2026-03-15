import React, { useState } from 'react';
import type { TestRunRecord } from 'core/types';
import { relativeTime } from '../../utils/formatters';

const STATUS_ICON: Record<string, string> = { pass: '\u2705', fail: '\u274C', partial: '\u26A0\uFE0F', error: '\u274C' };

function formatDuration(ms: number): string {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
}

export interface RunHistoryRowProps {
    run: TestRunRecord;
    isLast: boolean;
}

export function RunHistoryRow({ run, isLast }: RunHistoryRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                <span className="text-sm leading-none">{STATUS_ICON[run.status] || '\u2753'}</span>
                {!isLast && <div className="flex-1 w-px bg-slate-700 mt-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="w-full text-left cursor-pointer bg-transparent border-0 p-0"
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-300" title={run.ranAt}>{relativeTime(run.ranAt)}</span>
                        <span className="text-[10px] text-slate-600">{formatDuration(run.durationMs)}</span>
                        {run.splDriftDetected && run.splDriftDetected !== '0' && run.splDriftDetected !== 'false' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                                SPL Changed
                            </span>
                        )}
                        <svg
                            className={'w-3 h-3 text-slate-600 transition-transform ml-auto ' + (expanded ? 'rotate-180' : '')}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                {expanded && (
                    <div className="mt-2 flex flex-col gap-2">
                        {run.resultSummary && (
                            <p className="text-[11px] text-slate-400 m-0">{run.resultSummary}</p>
                        )}
                        {run.scenarioResults.length > 0 && (
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="text-slate-600">
                                        <th className="text-left font-medium pb-1 pr-2">Scenario</th>
                                        <th className="text-left font-medium pb-1 pr-2" style={{ width: 50 }}>Result</th>
                                        <th className="text-left font-medium pb-1">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {run.scenarioResults.map((sr, i) => (
                                        <tr key={i} className="border-t border-slate-800">
                                            <td className="py-1 pr-2 text-slate-300">{sr.scenarioName}</td>
                                            <td className="py-1 pr-2">
                                                <span className={sr.passed ? 'text-green-400' : 'text-red-400'}>
                                                    {sr.passed ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                            <td className="py-1 text-slate-500">{sr.message || '\u2014'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
