/**
 * SourceBadge — always-editable inline input for the row identifier.
 * Colored left border + dot show which sidebar source it came from.
 * No hidden click-to-edit mode — the input is always visible and typeable.
 */
import React, { useState, useCallback } from 'react';
import type { EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { useOrphanedFilters } from '../../hooks/useOrphanedFilters';
import { selectActiveTest } from 'core/store/selectors';

interface SourceBadgeProps {
    testId: EntityId;
    scenarioId: EntityId;
    inputId: EntityId;
    value: string;
    colorIndex: number;
    matchCount: number;
}

const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

export function SourceBadge({ testId, scenarioId, inputId, value, colorIndex, matchCount }: SourceBadgeProps): React.ReactElement {
    const updateRowIdentifier = useTestStore((s) => s.updateRowIdentifier);
    const deleteInput = useTestStore((s) => s.deleteInput);
    const test = useTestStore(selectActiveTest);
    const spl = (test && test.query && test.query.spl) || '';
    const [focused, setFocused] = useState(false);

    const color = COLORS[colorIndex % COLORS.length];
    // Count how many inputs before this one use the same RI (for occurrence matching)
    var occurrenceIndex = 0;
    if (test) {
        var scenario = test.scenarios.find(function (s) { return s.id === scenarioId; });
        if (scenario) {
            for (var ii = 0; ii < scenario.inputs.length; ii++) {
                if (scenario.inputs[ii].id === inputId) break;
                if (scenario.inputs[ii].rowIdentifier.trim().toLowerCase() === value.trim().toLowerCase()) {
                    occurrenceIndex++;
                }
            }
        }
    }
    // Get extracted fields for this data source (for optional-field marking)
    const sourceFields = (() => {
        if (!test || !test.fieldExtraction || !test.fieldExtraction.sources) return undefined;
        const src = test.fieldExtraction.sources.find(
            (s) => s.rowIdentifier.trim().toLowerCase() === value.trim().toLowerCase(),
        );
        return src ? src.fields : undefined;
    })();
    const orphans = useOrphanedFilters(spl, value, occurrenceIndex, sourceFields);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateRowIdentifier(testId, scenarioId, inputId, e.target.value);
    }, [testId, scenarioId, inputId, updateRowIdentifier]);

    const handleRemove = useCallback(() => {
        deleteInput(testId, scenarioId, inputId);
    }, [testId, scenarioId, inputId, deleteInput]);

    return (
        <div className="mb-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 ml-3.5">Data source in query</div>
            <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div
                    className="flex-1 flex items-center rounded-md transition-all duration-200"
                    style={{
                        backgroundColor: focused ? '#0a1628' : color + '15',
                        border: '1px solid ' + (focused ? color : color + '40'),
                        boxShadow: focused ? '0 0 0 2px ' + color + '20' : 'none',
                    }}
                >
                    <input
                        type="text"
                        value={value}
                        onChange={handleChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="Pick from sidebar or type: index=main sourcetype=..."
                        className="flex-1 min-w-0 px-2 py-1.5 text-[12px] font-mono bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                    {matchCount > 1 && (
                        <span
                            className="text-[10px] text-slate-500 pr-2 flex-shrink-0"
                            title={'Appears ' + matchCount + ' times \u2014 all replaced'}
                        >
                            {'\u00D7' + matchCount}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleRemove}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-red-900/30 hover:text-red-400 cursor-pointer transition-all text-[14px] flex-shrink-0"
                    title="Remove this data source"
                >
                    {'\u00D7'}
                </button>
            </div>

            {orphans.length > 0 && (() => {
                const blocking = orphans.filter((o) => !o.isOptional);
                const optional = orphans.filter((o) => o.isOptional);
                return (
                    <>
                        {blocking.length > 0 && (
                            <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-red-500/5 border border-red-500/20">
                                <span className="text-red-400 text-[12px] mt-px">{'\u26A0'}</span>
                                <div className="text-[11px] text-red-300/80 leading-snug">
                                    <span className="font-medium">Orphaned filters: </span>
                                    {blocking.map((o) => o.text).join(', ')}
                                    <span className="text-slate-500"> — these stay in the query and may cause zero results.</span>
                                </div>
                            </div>
                        )}
                        {optional.length > 0 && (
                            <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-blue-500/5 border border-blue-500/20">
                                <span className="text-blue-400 text-[12px] mt-px">{'\u2139'}</span>
                                <div className="text-[11px] leading-snug">
                                    <span className="text-blue-300/80 font-medium">Optional fields: </span>
                                    {optional.map((o, i) => (
                                        <span key={i}>
                                            {i > 0 && ', '}
                                            <span className="text-blue-300 font-semibold">{o.text}</span>
                                        </span>
                                    ))}
                                    <span className="text-slate-500"> — you can include these as input fields for more precise testing.</span>
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
}
