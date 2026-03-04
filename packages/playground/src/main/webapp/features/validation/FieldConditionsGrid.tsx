import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_FIELD_GROUPS } from 'core/constants/limits';
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
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-300 font-medium m-0">No validation rules yet</p>
            <p className="text-xs text-slate-500 mt-1 m-0">Add a field to start defining conditions for your query results.</p>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent-500 text-white hover:bg-accent-400 transition cursor-pointer"
            onClick={() => store.addFieldGroup(test.id)}
          >
            + Add First Condition
          </button>
        </div>
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

      {groups.length > 0 && (
        <button
          className="w-full py-2.5 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-accent-300 hover:border-accent-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => store.addFieldGroup(test.id)}
          disabled={atLimit}
        >
          + Add Field
        </button>
      )}

    </div>
  );
}
