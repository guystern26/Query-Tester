import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ConditionOperator, FieldConditionGroup } from 'core/types';
import { MAX_FIELD_GROUPS } from 'core/constants/limits';
import { isIJumpLockedField } from './utils/ijumpHelpers';
import { OP_GROUPS, VALUELESS_OPS } from './utils/operatorConstants';

const inputCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition';
const selectCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 cursor-pointer';

export function IjumpCustomConditions({ testId, groups }: { testId: string; groups: FieldConditionGroup[] }) {
  const store = useTestStore();
  const customGroups = groups.filter((g) => !isIJumpLockedField(g.field));
  const atLimit = groups.length >= MAX_FIELD_GROUPS;

  return (
    <div className="border-t border-slate-800 mt-4 pt-4">
      <div className="text-[11px] uppercase tracking-[1.5px] text-slate-400 mb-2">Custom Field Conditions (optional)</div>

      {customGroups.length === 0 && (
        <p className="text-xs text-slate-500 mb-2 m-0">Add conditions for fields beyond _time, reason, and status.</p>
      )}

      <div className="flex flex-col gap-2">
        {customGroups.map((g) => {
          const c = g.conditions[0];
          if (!c) return null;
          const hideValue = VALUELESS_OPS.has(c.operator);
          const isLockedWarning = isIJumpLockedField(g.field);
          return (
            <div key={g.id}>
              <div className="flex items-center gap-2">
                <input className={`${inputCls} w-[130px]`} value={g.field}
                  onChange={(e) => store.updateFieldGroupField(testId, g.id, e.target.value)}
                  placeholder="field name" />
                <select className={`${selectCls} w-[140px]`} value={c.operator}
                  onChange={(e) => store.updateConditionInGroup(testId, g.id, c.id, { operator: e.target.value as ConditionOperator })}>
                  {OP_GROUPS.map((og) => (
                    <optgroup key={og.label} label={og.label}>
                      {og.ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                {!hideValue && (
                  <input className={`${inputCls} w-[130px]`} value={c.value}
                    onChange={(e) => store.updateConditionInGroup(testId, g.id, c.id, { value: e.target.value })}
                    placeholder="expected value" />
                )}
                <button className="text-sm text-slate-500 hover:text-red-400 px-1 rounded transition cursor-pointer"
                  onClick={() => store.removeFieldGroup(testId, g.id)}>×</button>
              </div>
              {isLockedWarning && (
                <p className="text-[11px] text-amber-400 mt-0.5 ml-1 m-0">This field is already configured above</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="w-full py-2 mt-2 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-accent-300 hover:border-accent-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => store.addFieldGroup(testId)}
        disabled={atLimit}
      >
        + Add Custom Condition
      </button>
    </div>
  );
}
