import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, SingleCondition, ConditionOperator } from 'core/types';
import { OP_GROUPS, VALUELESS_OPS } from './utils/operatorConstants';

const inputCls = 'px-2.5 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition';
const selectCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 cursor-pointer';

export interface ConditionRowProps {
  testId: EntityId;
  groupId: EntityId;
  condition: SingleCondition;
  isOnly: boolean;
}

export function ConditionRow({ testId, groupId, condition, isOnly }: ConditionRowProps) {
  const store = useTestStore();
  const hideValue = VALUELESS_OPS.has(condition.operator);

  return (
    <div className="flex items-center gap-2">
      <select
        className={`${selectCls} w-40`}
        value={condition.operator}
        onChange={(e) => store.updateConditionInGroup(testId, groupId, condition.id, { operator: e.target.value as ConditionOperator })}
      >
        {OP_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
      {!hideValue && (
        <input
          className={`${inputCls} flex-1 min-w-0`}
          value={condition.value}
          onChange={(e) => store.updateConditionInGroup(testId, groupId, condition.id, { value: e.target.value })}
          placeholder="expected value"
        />
      )}
      <button
        className="text-slate-600 hover:text-red-400 px-1 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => store.removeConditionFromGroup(testId, groupId, condition.id)}
        disabled={isOnly}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
