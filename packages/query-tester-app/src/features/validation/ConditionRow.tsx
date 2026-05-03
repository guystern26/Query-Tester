import React, { useState, useRef, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, SingleCondition, ConditionOperator } from 'core/types';
import { OP_GROUPS, VALUELESS_OPS } from './utils/operatorConstants';

var ALL_FLAT: Array<{ value: ConditionOperator; label: string }> = [];
for (var gi = 0; gi < OP_GROUPS.length; gi++) {
    for (var oi = 0; oi < OP_GROUPS[gi].ops.length; oi++) {
        ALL_FLAT.push(OP_GROUPS[gi].ops[oi]);
    }
}

function getLabel(op: ConditionOperator): string {
    for (var i = 0; i < ALL_FLAT.length; i++) {
        if (ALL_FLAT[i].value === op) return ALL_FLAT[i].label;
    }
    return op;
}

export interface ConditionRowProps {
    testId: EntityId;
    groupId: EntityId;
    condition: SingleCondition;
    isOnly: boolean;
    isNew?: boolean;
}

export function ConditionRow({ testId, groupId, condition, isOnly }: ConditionRowProps) {
    var updateCondition = useTestStore(function (s) { return s.updateConditionInGroup; });
    var removeCondition = useTestStore(function (s) { return s.removeConditionFromGroup; });
    var hideValue = VALUELESS_OPS.has(condition.operator);
    var _open = useState(false);
    var open = _open[0];
    var setOpen = _open[1];
    var wrapRef = useRef<HTMLDivElement>(null);
    var btnRef = useRef<HTMLButtonElement>(null);
    var measureRef = useRef<HTMLSpanElement>(null);
    var _inputW = useState(120);
    var inputW = _inputW[0];
    var setInputW = _inputW[1];
    var _dropPos = useState({ left: 0, top: 0 });
    var dropPos = _dropPos[0];
    var setDropPos = _dropPos[1];

    useEffect(function () {
        if (!open) return;
        function handler(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handler);
        return function () { document.removeEventListener('mousedown', handler); };
    }, [open]);

    useEffect(function () {
        if (measureRef.current) {
            var w = Math.max(120, Math.min(250, measureRef.current.offsetWidth + 24));
            setInputW(w);
        }
    }, [condition.value]);

    var openDropdown = function () {
        if (btnRef.current) {
            var rect = btnRef.current.getBoundingClientRect();
            setDropPos({ left: rect.left, top: rect.top });
        }
        setOpen(!open);
    };

    var pick = function (op: ConditionOperator) {
        updateCondition(testId, groupId, condition.id, { operator: op });
        setOpen(false);
    };

    var label = getLabel(condition.operator);

    return (
        <div className="flex items-center gap-1.5 shrink-0" ref={wrapRef}>
            {/* Selected operator — click to change */}
            <button ref={btnRef} type="button" onClick={openDropdown}
                className="px-3.5 py-1.5 text-[13px] font-semibold rounded-lg bg-navy-700 border border-slate-500 text-slate-200 cursor-pointer hover:border-blue-300/50 transition-all shrink-0">
                {label}
                <svg className="w-2.5 h-2.5 inline ml-1 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown — all operators grouped */}
            {open && (
                <div className="fixed z-[9999] bg-navy-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden min-w-[160px] max-h-[320px] overflow-y-auto"
                    style={{ left: dropPos.left + 'px', top: (dropPos.top - 4) + 'px', transform: 'translateY(-100%)' }}>
                    {OP_GROUPS.map(function (g) {
                        return (
                            <div key={g.label}>
                                <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-slate-600 font-bold bg-navy-950 border-t border-slate-700/40">
                                    {g.label}
                                </div>
                                {g.ops.map(function (o) {
                                    var sel = condition.operator === o.value;
                                    return (
                                        <button key={o.value} type="button" onClick={function () { pick(o.value); }}
                                            className={'w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ' + (sel ? 'text-blue-300 bg-blue-300/10 font-semibold' : 'text-slate-300 hover:bg-navy-800')}>
                                            {o.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Value input — auto-grows */}
            {!hideValue && (
                <div className="relative shrink-0">
                    <span ref={measureRef}
                        className="invisible absolute whitespace-pre text-[13px] px-2"
                        style={{ fontFamily: 'inherit' }}>
                        {condition.value || 'value'}
                    </span>
                    <input
                        className="py-1.5 px-2.5 text-[13px] bg-navy-950 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-300"
                        style={{ width: inputW + 'px' }}
                        value={condition.value}
                        onChange={function (e) { updateCondition(testId, groupId, condition.id, { value: e.target.value }); }}
                        placeholder="value"
                    />
                </div>
            )}

            {/* Delete */}
            {!isOnly && (
                <button
                    className="text-slate-600 hover:text-red-400 transition cursor-pointer text-[16px] shrink-0 px-1"
                    onClick={function () { removeCondition(testId, groupId, condition.id); }}>
                    &times;
                </button>
            )}
        </div>
    );
}
