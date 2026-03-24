import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldConditionGroup, Scenario } from 'core/types';
import { MAX_CONDITIONS_PER_GROUP } from 'core/constants/limits';
import { ConditionRow } from './ConditionRow';
import { conditionPreview } from './conditionPreview';
import { FieldNameSelector } from './FieldNameSelector';

const inputCls = 'px-2.5 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition';
const selectCls = 'px-2 py-1.5 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 cursor-pointer';

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
  const store = useTestStore();
  const conds = group.conditions;
  const logic = group.conditionLogic;
  const atLimit = conds.length >= MAX_CONDITIONS_PER_GROUP;
  const scope = group.scenarioScope === 'all' ? 'all' : (Array.isArray(group.scenarioScope) ? group.scenarioScope[0] : 'all');
  const preview = conditionPreview(group);

  const scopeOpts = [
    { value: 'all', label: 'All Scenarios' },
    ...scenarios.map((s) => ({ value: s.id, label: s.name || 'Untitled' })),
  ];

  const toggleLogic = () => store.updateFieldGroupLogic(testId, group.id, logic === 'and' ? 'or' : 'and');

  return (
    <div className="bg-navy-800 rounded-lg border border-slate-700 p-4" data-tutorial="field-logic">
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
            store.updateFieldGroupScope(testId, group.id, v === 'all' ? 'all' : [v] as EntityId[]);
          }}>
          {scopeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="p-1.5 text-slate-500 hover:text-accent-300 rounded transition cursor-pointer" title="Duplicate"
          onClick={() => store.duplicateFieldGroup(testId, group.id)}>
          <CopyIcon />
        </button>
        <button
          className="p-1.5 text-slate-500 hover:text-red-400 rounded transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => store.removeFieldGroup(testId, group.id)}
          disabled={isOnly}
          title="Remove"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="text-[10px] uppercase tracking-[1.5px] text-slate-500 mb-2">Validation Conditions</div>

      {/* Condition rows with logic dividers */}
      <div className="flex flex-col gap-0">
        {conds.map((c, i) => (
          <div key={c.id}>
            {i > 0 && (
              <div className="flex items-center gap-2 my-1.5">
                <div className="flex-1 border-t border-slate-700/50" />
                <button
                  className={`text-[10px] font-bold px-3 py-1 rounded-md transition cursor-pointer ${
                    logic === 'or' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                  onClick={toggleLogic}
                >
                  {logic.toUpperCase()}
                </button>
                <div className="flex-1 border-t border-slate-700/50" />
              </div>
            )}
            <ConditionRow testId={testId} groupId={group.id} condition={c} isOnly={conds.length <= 1} />
          </div>
        ))}
      </div>

      <button
        className="text-xs text-slate-400 hover:text-accent-300 transition cursor-pointer mt-2 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => store.addConditionToGroup(testId, group.id)}
        disabled={atLimit}
      >
        + Add Condition
      </button>

      {preview && (
        <p className="text-[11px] text-slate-500 italic mt-2 m-0 truncate">Preview: {preview}</p>
      )}
    </div>
  );
}
