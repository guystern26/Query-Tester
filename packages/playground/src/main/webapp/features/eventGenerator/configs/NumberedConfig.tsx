import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';

export interface NumberedConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

export function NumberedConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: NumberedConfigProps) {
  const store = useTestStore();
  const cfg = (rule.config ?? {}) as any;

  const prefix = typeof cfg.prefix === 'string' ? cfg.prefix : '';
  const suffix = typeof cfg.suffix === 'string' ? cfg.suffix : '';
  const start = typeof cfg.start === 'number' ? cfg.start : 1;

  const updateConfig = (patch: Partial<{ prefix: string; suffix: string; start: number }>) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...cfg,
        ...patch,
      } as any,
    });
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
      <div style={{ minWidth: 140 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Prefix
        </label>
        <input
          type="text"
          value={prefix}
          onChange={(e) => updateConfig({ prefix: e.target.value })}
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
      <div style={{ minWidth: 140 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Suffix
        </label>
        <input
          type="text"
          value={suffix}
          onChange={(e) => updateConfig({ suffix: e.target.value })}
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
      <div style={{ minWidth: 100 }}>
        <label
          style={{
            display: 'block',
            marginBottom: 4,
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Start at
        </label>
        <input
          type="number"
          value={start}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) updateConfig({ start: n });
          }}
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

