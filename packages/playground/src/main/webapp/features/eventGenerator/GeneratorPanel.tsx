import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectInput } from 'core/store/selectors';
import type { EntityId } from 'core/types';
import { MAX_GENERATOR_EVENT_COUNT, MAX_GENERATOR_RULES } from 'core/constants/limits';
import { Switch } from '../../common';
import { GeneratorRule } from './GeneratorRule';

export interface GeneratorPanelProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
}

export function GeneratorPanel({ testId, scenarioId, inputId }: GeneratorPanelProps) {
  const store = useTestStore();
  const input = selectInput(store, scenarioId, inputId);
  if (!input) return null;

  const cfg = input.generatorConfig;
  const rules = cfg.rules;

  // Collect unique non-empty field names from the input's events
  const allFieldNames: string[] = [];
  if (input.events.length > 0) {
    for (const fv of input.events[0].fieldValues) {
      if (fv.field.trim() && !allFieldNames.includes(fv.field)) allFieldNames.push(fv.field);
    }
  }

  const hasFields = allFieldNames.length > 0;
  const usedFieldSet = new Set(rules.map((r) => r.field).filter(Boolean));
  const unusedFields = allFieldNames.filter((f) => !usedFieldSet.has(f));
  const canAddRule = rules.length < MAX_GENERATOR_RULES && unusedFields.length > 0;

  const handleEventCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === '') {
      store.updateGeneratorEventCount(testId, scenarioId, inputId, 0);
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    store.updateGeneratorEventCount(testId, scenarioId, inputId, Math.min(n, MAX_GENERATOR_EVENT_COUNT));
  };

  const handleAddRule = () => {
    store.addGeneratorRule(testId, scenarioId, inputId, { field: '', type: 'general_field', config: {} });
  };

  return (
    <div className="flex flex-col gap-2.5 pt-2">
      <div className="flex items-center justify-between">
        <Switch
          checked={cfg.enabled}
          onChange={(v) => store.setGeneratorEnabled(testId, scenarioId, inputId, v)}
          label="Enable generator"
        />
      </div>

      {cfg.enabled && !hasFields && (
        <p className="text-xs text-slate-500 italic m-0">Add field names to the table above to configure generation rules.</p>
      )}

      {cfg.enabled && hasFields && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-slate-400">Events:</label>
            <input
              type="number"
              min={0}
              max={MAX_GENERATOR_EVENT_COUNT}
              value={cfg.eventCount ?? ''}
              onChange={handleEventCountChange}
              placeholder="event count"
              className="w-[120px] px-2 py-1.5 text-[13px] bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
            />
          </div>

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
            className="flex items-center justify-center gap-1 w-full h-8 border border-dashed border-slate-700 rounded-lg bg-transparent text-xs text-slate-400 font-medium cursor-pointer transition hover:text-cyan-400 hover:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
