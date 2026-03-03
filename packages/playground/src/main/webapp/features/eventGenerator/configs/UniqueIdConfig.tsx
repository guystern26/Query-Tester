import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';
import { Select } from '../../../common';

export interface UniqueIdConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const formatOptions = [
  { value: 'uuid_v4', label: 'UUID v4' },
  { value: 'short_id', label: 'Short ID (base62)' },
  { value: 'hex_16', label: '16-char hex' },
];

export function UniqueIdConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: UniqueIdConfigProps) {
  const store = useTestStore();
  const cfg = (rule.config ?? {}) as any;
  const format: string = typeof cfg.format === 'string' ? cfg.format : '';

  const handleChange = (value: string) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...cfg,
        format: value,
      } as any,
    });
  };

  const options = [{ value: '', label: 'Select format...' }, ...formatOptions];

  return (
    <div style={{ marginTop: '4px', maxWidth: 260 }}>
      <Select value={format} options={options} onChange={handleChange} />
    </div>
  );
}

