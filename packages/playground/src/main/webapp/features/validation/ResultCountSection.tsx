import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, ResultCountRule, ResultCountOperator } from 'core/types';
import { Switch } from '../../common';

const selectCls = 'px-2.5 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer';
const inputCls = 'px-2.5 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition';

const RESULT_OPS: Array<{ value: ResultCountOperator; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
];

export interface ResultCountSectionProps {
  testId: EntityId;
  resultCount: ResultCountRule;
}

export function ResultCountSection({ testId, resultCount }: ResultCountSectionProps) {
  const store = useTestStore();

  return (
    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
      <div className="text-[10px] uppercase tracking-[1.5px] text-slate-500 mb-2">Result Count</div>
      <Switch
        checked={resultCount.enabled}
        onChange={(v) => store.updateResultCount(testId, { enabled: v })}
        label="Check result count"
      />
      {resultCount.enabled && (
        <div className="flex items-center gap-2 mt-2">
          <select
            className={`${selectCls} w-[150px]`}
            value={resultCount.operator}
            onChange={(e) => store.updateResultCount(testId, { operator: e.target.value as ResultCountOperator })}
          >
            {RESULT_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="number"
            className={`${inputCls} w-[100px]`}
            value={resultCount.value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) store.updateResultCount(testId, { value: n });
            }}
            placeholder="0"
          />
        </div>
      )}
    </div>
  );
}
