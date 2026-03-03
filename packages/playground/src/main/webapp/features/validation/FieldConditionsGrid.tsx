import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_FIELD_GROUPS } from 'core/constants/limits';
import { Message } from '../../common';
import { ValidationScopeSelector } from './ValidationScope';
import { FieldGroupCard } from './FieldGroupCard';

export function FieldConditionsGrid() {
  const store = useTestStore();
  const test = selectActiveTest(store);
  if (!test) return null;

  const groups = test.validation.fieldGroups;
  const fieldLogic = test.validation.fieldLogic;
  const scenarios = test.scenarios;
  const atLimit = groups.length >= MAX_FIELD_GROUPS;

  const toggleFieldLogic = () => store.updateFieldLogic(test.id, fieldLogic === 'and' ? 'or' : 'and');

  return (
    <div className="flex flex-col gap-3">
      <ValidationScopeSelector
        testId={test.id}
        scope={test.validation.validationScope}
        scopeN={test.validation.scopeN}
      />

      <div className="text-[10px] uppercase tracking-[1.5px] text-slate-500">Field Conditions</div>

      {groups.length === 0 && (
        <Message type="info">Add a field to start defining validation conditions.</Message>
      )}

      {groups.map((g, i) => (
        <div key={g.id}>
          {i > 0 && (
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 border-t border-slate-600/50" />
              <button
                className={`font-bold px-4 py-1.5 rounded-lg text-sm shadow transition cursor-pointer ${
                  fieldLogic === 'or'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
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
            isOnly={groups.length <= 1}
          />
        </div>
      ))}

      <button
        className="w-full py-2.5 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => store.addFieldGroup(test.id)}
        disabled={atLimit}
      >
        + Add Field
      </button>

    </div>
  );
}
