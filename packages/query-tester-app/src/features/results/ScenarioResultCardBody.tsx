/**
 * Expanded body content for a ScenarioResultCard.
 * Shows error banner, warnings, validations, result rows table, and injected SPL.
 */
import React, { useState, useMemo } from 'react';
import type { ScenarioResult, ValidationDetail } from 'core/types';
import { isInjectedRunId, isNestedJsonField, buildFieldFailures, MAX_DISPLAY_ROWS } from './resultHelpers';
import { ResultRowsTable } from './ResultRowsTable';
import { ValidationItem } from './ValidationItem';

export interface ScenarioResultCardBodyProps {
    result: ScenarioResult;
    sortedRows: Record<string, unknown>[];
    isNonTabular: boolean;
    passedCount: number;
    failedCount: number;
}

export function ScenarioResultCardBody({
    result,
    sortedRows,
    isNonTabular,
    passedCount,
    failedCount,
}: ScenarioResultCardBodyProps) {
    const [splOpen, setSplOpen] = useState(false);
    const [rowsOpen, setRowsOpen] = useState(true);

    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (result.resultRows && result.resultRows.length > 0) {
            const allKeys = new Set<string>();
            result.resultRows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
            allKeys.forEach((k) => {
                if (isInjectedRunId(k)) initial.add(k);
            });
        }
        return initial;
    });

    const toggleColumn = (col: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
    };

    const fieldsInResults = useMemo(() => {
        const s = new Set<string>();
        if (result.resultRows) {
            result.resultRows.forEach((r) => Object.keys(r).forEach((k) => s.add(k)));
        }
        return s;
    }, [result.resultRows]);

    const fieldFailures = useMemo(
        () => buildFieldFailures(result.validations),
        [result.validations],
    );

    return (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-700/40">
            {/* Error banner */}
            {result.error && (
                <div className="mt-3 px-3 py-2 rounded border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-300">
                    {result.error}
                </div>
            )}

            {/* Scenario warnings */}
            {result.warnings && result.warnings.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-3">
                    {result.warnings.map((w, i) => (
                        <div key={i} className="px-3 py-2 rounded border-l-4 border-amber-500 bg-amber-500/5 text-[13px] text-amber-300/90">
                            {w}
                        </div>
                    ))}
                </div>
            )}

            {/* Validations */}
            {result.validations.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Validations</span>
                        {failedCount > 0 && (
                            <span className="text-[10px] text-red-400">{failedCount} failed</span>
                        )}
                        {passedCount > 0 && failedCount > 0 && (
                            <span className="text-[10px] text-slate-500">{'\u00b7'}</span>
                        )}
                        {passedCount > 0 && (
                            <span className="text-[10px] text-green-400/70">{passedCount} passed</span>
                        )}
                    </div>
                    {result.validations.map((v: ValidationDetail, i: number) => (
                        <ValidationItem key={i} v={v} fieldExistsInResults={fieldsInResults.has(v.field)} />
                    ))}
                </div>
            )}

            {/* Query Results Table */}
            {sortedRows.length > 0 && (
                <div className="mt-1">
                    <button
                        type="button"
                        className="text-[11px] font-medium text-slate-400 uppercase tracking-wider hover:text-slate-200 cursor-pointer bg-transparent border-none p-0 transition-colors mb-2 flex items-center gap-1"
                        onClick={() => setRowsOpen(!rowsOpen)}
                    >
                        <span className={`text-[9px] transition-transform duration-150 ${rowsOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                        Query Results
                        <span className="normal-case tracking-normal font-normal text-slate-500">
                            ({result.resultCount} result{result.resultCount !== 1 ? 's' : ''}
                            {result.resultCount > MAX_DISPLAY_ROWS ? ', showing first ' + MAX_DISPLAY_ROWS : ''})
                        </span>
                    </button>
                    {rowsOpen && (
                        isNonTabular ? (
                            <div className="px-3 py-2 rounded border border-amber-500/20 bg-amber-500/5 text-[12px] text-amber-300/90">
                                Results did not come back in table format. The query may have returned raw events without structured fields.
                            </div>
                        ) : (
                            <ResultRowsTable
                                rows={sortedRows}
                                hiddenColumns={hiddenColumns}
                                onToggleColumn={toggleColumn}
                                fieldFailures={fieldFailures}
                                validations={result.validations}
                            />
                        )
                    )}
                </div>
            )}

            {/* Injected SPL */}
            {result.injectedSpl && (
                <div className="border-t border-slate-700/40 pt-2 mt-1">
                    <button
                        type="button"
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-300 cursor-pointer bg-transparent border-none p-0 transition-colors flex items-center gap-1"
                        onClick={() => setSplOpen(!splOpen)}
                    >
                        <span className={`text-[9px] transition-transform duration-150 ${splOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                        Injected SPL
                    </button>
                    {splOpen && (
                        <pre className="mt-1.5 p-2.5 rounded bg-navy-950 text-[12px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                            {result.injectedSpl}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}
