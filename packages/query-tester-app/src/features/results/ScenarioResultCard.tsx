/**
 * Collapsible card showing a single scenario's result: validations, result rows table, injected SPL.
 */
import React, { useState, useMemo } from 'react';
import type { ScenarioResult } from 'core/types';
import { formatMs, isInjectedRunId, isNestedJsonField } from './resultHelpers';
import { ScenarioResultCardBody } from './ScenarioResultCardBody';

export interface ScenarioResultCardProps {
    result: ScenarioResult;
}

function ScenarioResultCardInner({ result }: ScenarioResultCardProps) {
    const [isOpen, setIsOpen] = useState(!result.passed);

    const sortedRows = useMemo(() => {
        if (!result.resultRows || result.resultRows.length === 0) return [];
        return result.resultRows;
    }, [result.resultRows]);

    const isNonTabular = useMemo(() => {
        if (sortedRows.length === 0) return false;
        const visibleFields = new Set<string>();
        sortedRows.forEach((r) => {
            Object.keys(r).forEach((k) => {
                if (!k.startsWith('_') && !isInjectedRunId(k) && !isNestedJsonField(k)) {
                    visibleFields.add(k);
                }
            });
        });
        return visibleFields.size === 0;
    }, [sortedRows]);

    const passedCount = result.validations.filter((v) => v.passed).length;
    const failedCount = result.validations.length - passedCount;

    return (
        <div className={`border rounded-lg overflow-hidden ${
            result.passed
                ? 'bg-navy-800/80 border-green-400/15'
                : 'bg-navy-800/80 border-red-500/20'
        }`}>
            {/* Header */}
            <div
                className="flex justify-between items-center px-4 py-2.5 cursor-pointer transition-colors hover:bg-navy-700/30"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-semibold text-sm flex items-center gap-2 text-slate-200">
                    {result.scenarioName || 'Unnamed scenario'}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        result.passed
                            ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                    </span>
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs tabular-nums">
                        {result.resultCount} row{result.resultCount !== 1 ? 's' : ''}
                        {' \u00b7 '}
                        {formatMs(result.executionTimeMs)}
                    </span>
                    <span className={`text-slate-500 text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        &#9660;
                    </span>
                </div>
            </div>

            {/* Body */}
            {isOpen && (
                <ScenarioResultCardBody
                    result={result}
                    sortedRows={sortedRows}
                    isNonTabular={isNonTabular}
                    passedCount={passedCount}
                    failedCount={failedCount}
                />
            )}
        </div>
    );
}

export const ScenarioResultCard = React.memo(ScenarioResultCardInner);
