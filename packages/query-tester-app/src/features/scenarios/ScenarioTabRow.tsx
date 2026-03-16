import React from 'react';
import type { Scenario } from 'core/types';
import { getScenarioColor } from './scenarioColors';

export const hasData = (s: Scenario): boolean => s.inputs.some((inp) =>
    inp.rowIdentifier.trim() || inp.jsonContent.trim() || inp.fileRef
    || inp.events.some((e) => e.fieldValues.some((fv) => fv.field.trim() || fv.value.trim())));

export interface ScenarioTabRowProps {
    scenarios: Scenario[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    canAdd: boolean;
    onAdd: () => void;
}

export function ScenarioTabRow({
    scenarios, selectedId, onSelect, onRemove, canAdd, onAdd,
}: ScenarioTabRowProps): React.ReactElement {
    return (
        <div className="flex items-center border-b border-slate-800 mb-4">
            {scenarios.map((s, i) => {
                const sc = getScenarioColor(i);
                return (
                    <div key={s.id} className="relative group">
                        <button
                            className={`px-4 py-2 text-[13px] -mb-px border-b-2 transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                                s.id === selectedId
                                    ? `font-semibold ${sc.text} ${sc.border}`
                                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-navy-800'
                            }`}
                            onClick={() => onSelect(s.id)}
                        >
                            {s.name.trim() || `Scenario ${i + 1}`}
                            {hasData(s) && <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />}
                        </button>
                        {scenarios.length > 1 && (
                            <button
                                className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full text-[11px] text-slate-500 hover:text-red-400 hover:bg-red-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 cursor-pointer"
                                onClick={() => onRemove(s.id)}
                            >
                                ×
                            </button>
                        )}
                    </div>
                );
            })}
            <button
                className="w-6 h-6 rounded-full bg-navy-800 text-slate-400 text-sm ml-2 -mb-px flex items-center justify-center hover:text-accent-300 hover:bg-navy-700 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={onAdd}
                disabled={!canAdd}
            >
                +
            </button>
        </div>
    );
}
