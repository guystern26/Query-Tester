import React, { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectInput } from 'core/store/selectors';
import type { EntityId } from 'core/types';
import { MAX_GENERATOR_RULES } from 'core/constants/limits';
import { EmptyState } from '../../common';
import { GeneratorRule } from './GeneratorRule';

export interface GeneratorPanelProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  /** Override field names (e.g. extracted from JSON). When omitted, fields are read from the events table. */
  fieldNames?: string[];
}

export function GeneratorPanel({ testId, scenarioId, inputId, fieldNames }: GeneratorPanelProps) {
  const input = useTestStore((s) => selectInput(s, scenarioId, inputId));
  const addGeneratorRule = useTestStore((s) => s.addGeneratorRule);
  if (!input) return null;

  const cfg = input.generatorConfig;
  const rules = cfg.rules;

  const events = input.events;

  // Use provided fieldNames (JSON mode) or collect from events table (fields mode)
  const allFieldNames = useMemo(() => {
    if (fieldNames) return fieldNames;
    const names: string[] = [];
    if (events.length > 0) {
      for (const fv of events[0].fieldValues) {
        if (fv.field.trim() && !names.includes(fv.field)) names.push(fv.field);
      }
    }
    return names;
  }, [fieldNames, events]);

  const hasFields = allFieldNames.length > 0;
  const usedFieldSet = new Set(rules.map((r) => r.field).filter(Boolean));
  const unusedFields = allFieldNames.filter((f) => !usedFieldSet.has(f));
  const canAddRule = rules.length < MAX_GENERATOR_RULES && unusedFields.length > 0;

  const handleAddRule = () => {
    addGeneratorRule(testId, scenarioId, inputId, { field: '', type: 'general_field', config: {} });
  };

  return (
    <div className="flex flex-col gap-2.5 pt-2" data-tutorial="gen-rules">
      {!hasFields && (
        <p className="text-xs text-slate-500 italic m-0">
          {fieldNames ? 'No fields found in the JSON data.' : 'Add field names to the table above to configure generation rules.'}
        </p>
      )}

      {hasFields && rules.length === 0 && (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
          iconBg="bg-yellow-900/30"
          title="No generation rules yet"
          subtitle="Add a rule to auto-generate field values for events."
          actionLabel="+ Add First Rule"
          onAction={handleAddRule}
        />
      )}

      {hasFields && rules.length > 0 && (
        <>
          {rules.map((rule) => (
            <GeneratorRule
              key={rule.id}
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
              usedFields={rules.filter((r) => r.id !== rule.id).map((r) => r.field).filter(Boolean)}
              availableFields={allFieldNames}
            />
          ))}

          <button
            className="flex items-center justify-center gap-1 w-full h-8 border border-dashed border-slate-700 rounded-lg bg-transparent text-xs text-slate-400 font-medium cursor-pointer transition hover:text-blue-300 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleAddRule}
            disabled={!canAddRule}
          >
            {unusedFields.length === 0 && rules.length > 0 ? 'All fields assigned' : '+ Add Rule'}
          </button>
        </>
      )}
    </div>
  );
}
