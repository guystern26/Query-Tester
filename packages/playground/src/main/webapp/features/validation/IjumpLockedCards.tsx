import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ConditionOperator, FieldConditionGroup } from 'core/types';
import {
  type IjumpSubMode,
  JUMPING_STATUS_VALUES,
  MONITORING_STATUS_VALUES,
  REASON_OPERATORS,
  VALUELESS_OPS,
} from './utils/ijumpHelpers';

/* ── icons ─────────────────────────────────────────────────── */

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ── shared styles ─────────────────────────────────────────── */

const inputCls = 'px-2 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition';
const selectCls = 'px-2 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer';
const badgeCls = 'text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono';
const disabledCls = 'px-2 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed';

const lockHeader = (
  <div className="flex items-center gap-2 mb-2">
    <LockIcon />
    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">locked</span>
  </div>
);

/* ── AND divider ───────────────────────────────────────────── */

export function AndDivider() {
  return (
    <div className="flex justify-center">
      <span className="bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">AND</span>
    </div>
  );
}

/* ── _time card ────────────────────────────────────────────── */

export function TimeCard() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
      {lockHeader}
      <div className="flex items-center gap-2">
        <span className={badgeCls}>_time</span>
        <span className={disabledCls}>is_not_empty</span>
      </div>
    </div>
  );
}

/* ── reason card ───────────────────────────────────────────── */

export function ReasonCard({ testId, group }: { testId: string; group: FieldConditionGroup | null }) {
  const store = useTestStore();
  const [expanded, setExpanded] = useState(false);

  // Additional conditions beyond the base is_not_empty
  const additionalConds = group ? group.conditions.filter((c) => c.operator !== 'is_not_empty') : [];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
      {lockHeader}
      <div className="flex items-center gap-2">
        <span className={badgeCls}>reason</span>
        <span className={disabledCls}>is_not_empty</span>
      </div>

      <button
        className="flex items-center gap-1.5 mt-3 text-[12px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronIcon open={expanded} />
        <span>Additional Conditions ({additionalConds.length})</span>
      </button>

      {expanded && group && (
        <div className="mt-2 pl-4 flex flex-col gap-2">
          {additionalConds.map((c) => {
            const hideValue = VALUELESS_OPS.has(c.operator);
            return (
              <div key={c.id} className="flex items-center gap-2">
                <select className={`${selectCls} w-[130px]`} value={c.operator}
                  onChange={(e) => store.updateConditionInGroup(testId, group.id, c.id, { operator: e.target.value as ConditionOperator })}>
                  {REASON_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {!hideValue && (
                  <input className={`${inputCls} w-[140px]`} value={c.value}
                    onChange={(e) => store.updateConditionInGroup(testId, group.id, c.id, { value: e.target.value })}
                    placeholder="value" />
                )}
                <button className="text-sm text-slate-500 hover:text-red-400 px-1 rounded transition cursor-pointer"
                  onClick={() => store.removeConditionFromGroup(testId, group.id, c.id)}>×</button>
              </div>
            );
          })}
          <button className="text-xs text-slate-400 hover:text-cyan-400 transition cursor-pointer py-1"
            onClick={() => store.addConditionToGroup(testId, group.id, { operator: 'equals' as ConditionOperator, value: '' })}>
            + Add Condition
          </button>
        </div>
      )}
    </div>
  );
}

/* ── status card ───────────────────────────────────────────── */

export function StatusCard({ subMode }: { subMode: IjumpSubMode }) {
  const isJumping = subMode === 'jumping';
  const values = isJumping ? JUMPING_STATUS_VALUES : MONITORING_STATUS_VALUES;
  const borderCls = isJumping ? 'border-orange-800' : 'border-green-800';
  const accentCls = isJumping ? 'text-orange-400 font-bold' : 'text-green-400 font-bold';
  const pillCls = isJumping
    ? 'border border-orange-800 bg-orange-900/30 text-orange-400'
    : 'border border-green-800 bg-green-900/30 text-green-400';
  const info = isJumping
    ? "Validates _time and reason are not empty, and status equals 'jumping' or 'idle'"
    : "Validates _time and reason are not empty, and status equals 'valid', 'warning', or 'error'";

  return (
    <div className={`bg-slate-900 border ${borderCls} rounded-lg p-3`}>
      {lockHeader}
      <div className="flex flex-col gap-1.5">
        {values.map((val, i) => (
          <div key={val} className="flex items-center gap-2">
            {i === 0 ? <span className="w-8" /> : <span className={`w-8 text-[11px] ${accentCls}`}>OR</span>}
            <span className={disabledCls + ' font-mono'}>status</span>
            <span className={disabledCls}>equals</span>
            <span className={`px-2.5 py-1 text-[13px] font-semibold rounded-lg ${pillCls}`}>&quot;{val}&quot;</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500 italic m-0">{info}</p>
    </div>
  );
}
