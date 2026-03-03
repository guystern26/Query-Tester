import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';

export interface RandomNumberConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

export function RandomNumberConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: RandomNumberConfigProps) {
  const store = useTestStore();
  const cfg = (rule.config ?? {}) as any;

  const min = typeof cfg.min === 'number' ? cfg.min : 0;
  const max = typeof cfg.max === 'number' ? cfg.max : 100;
  const decimals = typeof cfg.decimals === 'number' ? cfg.decimals : 0;

  const updateConfig = (patch: Partial<{ min: number; max: number; decimals: number }>) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...cfg,
        ...patch,
      } as any,
    });
  };

  const handleMinChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) updateConfig({ min: n });
  };

  const handleMaxChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) updateConfig({ max: n });
  };

  const handleDecimalsChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0 && Number.isInteger(n)) updateConfig({ decimals: n });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--radius-md)',
        marginTop: '4px',
      }}
    >
      <div style={{ minWidth: 120 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Min
        </label>
        <input
          type="number"
          value={min}
          onChange={(e) => handleMinChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
          }}
        />
      </div>
      <div style={{ minWidth: 120 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Max
        </label>
        <input
          type="number"
          value={max}
          onChange={(e) => handleMaxChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
          }}
        />
      </div>
      <div style={{ minWidth: 120 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Decimals
        </label>
        <input
          type="number"
          min={0}
          value={decimals}
          onChange={(e) => handleDecimalsChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
          }}
        />
      </div>
    </div>
  );
}

