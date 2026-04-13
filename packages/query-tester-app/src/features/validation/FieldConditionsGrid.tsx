import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_FIELD_GROUPS } from 'core/constants/limits';
import { EmptyState } from '../../common';
import { ValidationScopeSelector } from './ValidationScope';
import { FieldGroupCard } from './FieldGroupCard';
import { SuggestFieldsButton } from './SuggestFieldsButton';

export function FieldConditionsGrid() {
  const test = useTestStore(selectActiveTest);
  const updateFieldLogic = useTestStore((s) => s.updateFieldLogic);
  const addFieldGroup = useTestStore((s) => s.addFieldGroup);
  if (!test) return null;

  const groups = test.validation.fieldGroups;
  const fieldLogic = test.validation.fieldLogic;
  const scenarios = test.scenarios;
  const atLimit = groups.length >= MAX_FIELD_GROUPS;

  const toggleFieldLogic = () => updateFieldLogic(test.id, fieldLogic === 'and' ? 'or' : 'and');

  return (
    <div className="flex flex-col gap-3" data-tutorial="field-conditions">
      <ValidationScopeSelector
        testId={test.id}
        scope={test.validation.validationScope}
        scopeN={test.validation.scopeN}
      />

      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[1.5px] text-slate-500">Field Conditions</div>
        <SuggestFieldsButton />
      </div>

      <div className="flex justify-center">
        <button
          className="px-5 py-1.5 rounded-lg border border-dashed border-slate-600 text-[12px] font-medium text-slate-400 hover:text-blue-300 hover:border-blue-300/40 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => addFieldGroup(test.id)}
          disabled={atLimit}
        >
          + Add Field
        </button>
      </div>

      {groups.length === 0 && (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
          iconBg="bg-purple-900/30"
          title="No validation rules yet"
          subtitle="Add a field to start defining conditions for your query results."
          actionLabel="+ Add First Condition"
          onAction={() => addFieldGroup(test.id)}
        />
      )}

      {groups.map((g, i) => (
        <div key={g.id}>
          {i > 0 && (
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 border-t border-slate-600/50" />
              <button
                className={`font-bold px-4 py-1.5 rounded-md text-[11px] transition-colors duration-200 cursor-pointer border ${
                  fieldLogic === 'or'
                    ? 'bg-navy-700 border-orange-500/40 text-orange-300 hover:border-orange-400/60'
                    : 'bg-navy-700 border-blue-400/40 text-blue-300 hover:border-blue-300/60'
                }`}
                onClick={toggleFieldLogic}
              >
                {fieldLogic.toUpperCase()}
              </button>
              <div className="flex-1 border-t border-slate-600/50" />
            </div>
          )}
          <FieldGroupCard
            testId={test.id}
            group={g}
            index={i + 1}
            scenarios={scenarios}
            isOnly={false}
          />
        </div>
      ))}


    </div>
  );
}
