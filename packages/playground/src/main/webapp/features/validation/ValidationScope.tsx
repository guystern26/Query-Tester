import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, ValidationScope as VSType } from 'core/types';

const selectCls = 'px-2.5 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer';
const inputCls = 'px-2.5 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition';

const SCOPE_OPTIONS: { value: VSType; label: string }[] = [
  { value: 'all_events', label: 'ALL events must match' },
  { value: 'any_event', label: 'AT LEAST ONE event must match' },
  { value: 'exactly_n', label: 'EXACTLY N events must match' },
  { value: 'at_least_n', label: 'AT LEAST N events must match' },
  { value: 'at_most_n', label: 'AT MOST N events must match' },
];

const NEEDS_N = new Set<VSType>(['exactly_n', 'at_least_n', 'at_most_n']);

export interface ValidationScopeProps {
  testId: EntityId;
  scope: VSType;
  scopeN: number | null;
}

export function ValidationScopeSelector({ testId, scope, scopeN }: ValidationScopeProps) {
  const store = useTestStore();

  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as VSType;
    store.updateValidationScope(testId, v, NEEDS_N.has(v) ? (scopeN ?? 1) : null);
  };

  const handleNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (!Number.isNaN(n) && n >= 0) store.updateValidationScope(testId, scope, n);
  };

  return (
    <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
      <div className="text-[10px] uppercase tracking-[1.5px] text-slate-500 mb-2">Validation Scope</div>
      <div className="flex items-center gap-2">
        <select className={`${selectCls} flex-1`} value={scope} onChange={handleScopeChange}>
          {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {NEEDS_N.has(scope) && (
          <input
            type="number"
            min={0}
            className={`${inputCls} w-20`}
            value={scopeN ?? 1}
            onChange={handleNChange}
            placeholder="N"
          />
        )}
      </div>
    </div>
  );
}
