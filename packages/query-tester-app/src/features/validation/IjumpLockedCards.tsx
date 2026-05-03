import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ConditionOperator, FieldConditionGroup } from 'core/types';
import {
  type IjumpSubMode,
  JUMPING_STATUS_VALUES,
  MONITORING_STATUS_VALUES,
  REASON_OPERATORS,
} from './utils/ijumpHelpers';
import { VALUELESS_OPS } from './utils/operatorConstants';

/* ── icons ─────────────────────────────────────────────────── */

var LockIcon = function () {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
};

/* ── shared styles ─────────────────────────────────────────── */

var badgeCls = 'text-xs font-bold px-2 py-0.5 rounded bg-navy-800 text-slate-400 font-mono';
var disabledCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed';
var inputCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition';
var selectCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 cursor-pointer';

var lockHeader = (
    <div className="flex items-center gap-2 mb-2">
        <LockIcon />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">locked</span>
    </div>
);

/* ── AND divider ───────────────────────────────────────────── */

export function AndDivider() {
    return (
        <div className="flex justify-center">
            <span className="bg-navy-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">AND</span>
        </div>
    );
}

/* ── _time card ────────────────────────────────────────────── */

export function TimeCard() {
    return (
        <div className="bg-navy-900 border border-slate-700 rounded-lg p-3">
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
    var updateConditionInGroup = useTestStore(function (s) { return s.updateConditionInGroup; });
    var removeConditionFromGroup = useTestStore(function (s) { return s.removeConditionFromGroup; });
    var addConditionToGroup = useTestStore(function (s) { return s.addConditionToGroup; });

    var additionalConds = group ? group.conditions.filter(function (c) { return c.operator !== 'is_not_empty'; }) : [];

    return (
        <div className="bg-navy-900 border border-slate-700 rounded-lg p-3">
            {lockHeader}
            <div className="flex items-center gap-2 mb-2">
                <span className={badgeCls}>reason</span>
                <span className={disabledCls}>is_not_empty</span>
            </div>

            {/* Always-visible condition area */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1 pl-1">
                {additionalConds.map(function (c) {
                    var hideValue = VALUELESS_OPS.has(c.operator);
                    return (
                        <div key={c.id} className="flex items-center gap-1.5 bg-navy-800 border border-slate-700 rounded-lg px-2 py-1">
                            <select className={selectCls + ' text-[11px] py-0.5 px-1 w-[110px]'} value={c.operator}
                                onChange={function (e) { updateConditionInGroup(testId, group!.id, c.id, { operator: e.target.value as ConditionOperator }); }}>
                                {REASON_OPERATORS.map(function (o) { return <option key={o.value} value={o.value}>{o.label}</option>; })}
                            </select>
                            {!hideValue && (
                                <input className={inputCls + ' text-[11px] py-0.5 px-1.5 w-[100px]'} value={c.value}
                                    onChange={function (e) { updateConditionInGroup(testId, group!.id, c.id, { value: e.target.value }); }}
                                    placeholder="value" />
                            )}
                            <button className="text-[12px] text-slate-500 hover:text-red-400 transition cursor-pointer"
                                onClick={function () { removeConditionFromGroup(testId, group!.id, c.id); }}>&times;</button>
                        </div>
                    );
                })}

                {group && (
                    <button
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-blue-300 border border-dashed border-blue-300/30 rounded-lg hover:bg-blue-300/10 transition cursor-pointer"
                        onClick={function () { addConditionToGroup(testId, group.id, { operator: 'equals' as ConditionOperator, value: '' }); }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add filter
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── status card with toggleable cubes ────────────────────── */

interface StatusCardProps {
    testId: string;
    group: FieldConditionGroup | null;
    subMode: IjumpSubMode;
}

export function StatusCard({ testId, group, subMode }: StatusCardProps) {
    var updateConditionInGroup = useTestStore(function (s) { return s.updateConditionInGroup; });
    var addConditionToGroup = useTestStore(function (s) { return s.addConditionToGroup; });
    var removeConditionFromGroup = useTestStore(function (s) { return s.removeConditionFromGroup; });

    var isJumping = subMode === 'jumping';
    var allValues = isJumping ? JUMPING_STATUS_VALUES : MONITORING_STATUS_VALUES;
    var borderCls = isJumping ? 'border-orange-800' : 'border-emerald-800';

    // Determine which values are currently enabled (have a condition in the group)
    var enabledValues = new Set<string>();
    if (group) {
        for (var i = 0; i < group.conditions.length; i++) {
            var val = group.conditions[i].value.replace(/^["']|["']$/g, '');
            if (allValues.indexOf(val) !== -1) enabledValues.add(val);
        }
    }

    var handleToggle = function (val: string) {
        if (!group) return;
        if (enabledValues.has(val)) {
            // Disable: remove the condition for this value (but keep at least 1)
            if (enabledValues.size <= 1) return;
            var cond = group.conditions.find(function (c) {
                return c.value.replace(/^["']|["']$/g, '') === val;
            });
            if (cond) removeConditionFromGroup(testId, group.id, cond.id);
        } else {
            // Enable: add a condition for this value
            addConditionToGroup(testId, group.id, { operator: 'equals' as ConditionOperator, value: val });
        }
    };

    var getColor = function (val: string): { bg: string; border: string; text: string } {
        if (isJumping) {
            if (val === 'jumping') return { bg: 'bg-orange-900/40', border: 'border-orange-500/50', text: 'text-orange-300' };
            return { bg: 'bg-blue-900/40', border: 'border-blue-500/50', text: 'text-blue-300' };
        }
        if (val === 'error') return { bg: 'bg-red-900/40', border: 'border-red-500/50', text: 'text-red-300' };
        if (val === 'warning') return { bg: 'bg-amber-900/40', border: 'border-amber-500/50', text: 'text-amber-300' };
        return { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-300' };
    };

    var info = isJumping
        ? 'Click a status to include/exclude it from validation'
        : 'Click a status to include/exclude it from validation';

    return (
        <div className={'bg-navy-900 border ' + borderCls + ' rounded-lg p-3'}>
            {lockHeader}
            <div className="flex items-center gap-2 mb-2">
                <span className={badgeCls}>status</span>
                <span className="text-[10px] text-slate-500">equals any of:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {allValues.map(function (val) {
                    var enabled = enabledValues.has(val);
                    var colors = getColor(val);
                    var canDisable = enabledValues.size > 1;
                    return (
                        <button key={val} type="button"
                            onClick={function () { handleToggle(val); }}
                            className={'px-4 py-2 rounded-lg text-[13px] font-bold border-2 transition-all duration-200 cursor-pointer '
                                + (enabled
                                    ? colors.bg + ' ' + colors.border + ' ' + colors.text
                                    : 'bg-navy-950 border-slate-700 text-slate-600 line-through opacity-50 hover:opacity-70')
                            }
                            title={enabled ? (canDisable ? 'Click to exclude' : 'At least one status required') : 'Click to include'}
                        >
                            {val}
                        </button>
                    );
                })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 italic m-0">{info}</p>
        </div>
    );
}
