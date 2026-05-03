import React, { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldConditionGroup, Scenario } from 'core/types';
import { MAX_CONDITIONS_PER_GROUP } from 'core/constants/limits';
import { ConditionRow } from './ConditionRow';
import { conditionPreview } from './conditionPreview';
import { FieldNameSelector } from './FieldNameSelector';

const inputCls = 'px-2.5 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition';
const selectCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 cursor-pointer';

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export interface FieldGroupCardProps {
  testId: EntityId;
  group: FieldConditionGroup;
  index: number;
  scenarios: Scenario[];
  isOnly: boolean;
}

export function FieldGroupCard({ testId, group, index, scenarios, isOnly }: FieldGroupCardProps) {
  const updateFieldGroupLogic = useTestStore((s) => s.updateFieldGroupLogic);
  const updateFieldGroupScope = useTestStore((s) => s.updateFieldGroupScope);
  const duplicateFieldGroup = useTestStore((s) => s.duplicateFieldGroup);
  const removeFieldGroup = useTestStore((s) => s.removeFieldGroup);
  const addConditionToGroup = useTestStore((s) => s.addConditionToGroup);
  const conds = group.conditions;
  const logic = group.conditionLogic;
  const atLimit = conds.length >= MAX_CONDITIONS_PER_GROUP;
  const scope = group.scenarioScope === 'all' ? 'all' : (Array.isArray(group.scenarioScope) ? group.scenarioScope[0] : 'all');
  const preview = useMemo(() => conditionPreview(group), [group]);

  const scopeOpts = [
    { value: 'all', label: 'All Scenarios' },
    ...scenarios.map((s) => ({ value: s.id, label: s.name || 'Untitled' })),
  ];

  const toggleLogic = () => updateFieldGroupLogic(testId, group.id, logic === 'and' ? 'or' : 'and');

  return (
    <div className="bg-navy-900 rounded-lg border border-slate-700 p-4" data-tutorial="field-logic">
      {/* Top row: number + field name + scope + copy + delete */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">
          {index}
        </span>
        <FieldNameSelector
          testId={testId}
          groupId={group.id}
          value={group.field}
          className="flex-1 min-w-0"
        />
        <select className={`${selectCls} text-xs w-[120px]`} value={scope}
          onChange={(e) => {
            const v = e.target.value;
            updateFieldGroupScope(testId, group.id, v === 'all' ? 'all' : [v] as EntityId[]);
          }}>
          {scopeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="p-1.5 text-slate-500 hover:text-blue-300 rounded transition cursor-pointer" title="Duplicate"
          onClick={() => duplicateFieldGroup(testId, group.id)}>
          <CopyIcon />
        </button>
        <button
          className="p-1.5 text-slate-500 hover:text-red-400 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => removeFieldGroup(testId, group.id)}
          disabled={isOnly}
          title="Remove"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Conditions — inline horizontal with scroll arrows */}
      <ConditionsStrip
        testId={testId}
        groupId={group.id}
        conds={conds}
        logic={logic}
        toggleLogic={toggleLogic}
        onAdd={() => addConditionToGroup(testId, group.id)}
        atLimit={atLimit}
      />

    </div>
  );
}

/* ── Wrapping conditions strip ───────────────────────────── */

interface ConditionsStripProps {
  testId: EntityId;
  groupId: EntityId;
  conds: FieldConditionGroup['conditions'];
  logic: 'and' | 'or';
  toggleLogic: () => void;
  onAdd: () => void;
  atLimit: boolean;
}

function ConditionsStrip({ testId, groupId, conds, logic, toggleLogic, onAdd, atLimit }: ConditionsStripProps) {
  // Build pairs: 2 conditions per row
  var rows: Array<Array<{ cond: typeof conds[0]; idx: number }>> = [];
  var currentRow: Array<{ cond: typeof conds[0]; idx: number }> = [];
  for (var ci = 0; ci < conds.length; ci++) {
    currentRow.push({ cond: conds[ci], idx: ci });
    if (currentRow.length === 3 || ci === conds.length - 1) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {rows.map(function (row, ri) {
        return (
          <div key={ri}>
            {ri > 0 && (
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 border-t border-slate-700/20" />
                <button className={'text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all hover:scale-125 ' + (logic === 'or' ? 'text-orange-400' : 'text-blue-400')}
                  onClick={toggleLogic} title="Click to toggle AND/OR">{logic.toUpperCase()}</button>
                <div className="flex-1 border-t border-slate-700/20" />
              </div>
            )}
            <div className="flex items-center">
              {row.map(function (item, ii) {
                return (
                  <React.Fragment key={item.cond.id}>
                    {ii > 0 && (
                      <button className={'text-[9px] font-bold px-2 rounded cursor-pointer transition-all shrink-0 hover:scale-125 ' + (logic === 'or' ? 'text-orange-400' : 'text-blue-400')}
                        onClick={toggleLogic} title="Click to toggle AND/OR"
                        style={{ animation: 'logicPulse 1.5s ease-out' }}>{logic.toUpperCase()}</button>
                    )}
                    <ConditionRow testId={testId} groupId={groupId} condition={item.cond} isOnly={conds.length <= 1} />
                  </React.Fragment>
                );
              })}
              {ri === rows.length - 1 && (
                <button
                  className="text-[12px] text-slate-500 hover:text-blue-300 transition cursor-pointer px-2.5 py-1.5 ml-2 rounded-lg border border-dashed border-slate-700 hover:border-blue-300/40 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={onAdd} disabled={atLimit}>+</button>
              )}
            </div>
          </div>
        );
      })}
      {conds.length === 0 && (
        <button
          className="text-[12px] text-slate-500 hover:text-blue-300 transition cursor-pointer px-2.5 py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-blue-300/40 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={onAdd} disabled={atLimit}>+ Add Condition</button>
      )}
    </div>
  );
}
