import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';
import { Button } from '../../../common';

export interface PickListConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

type Item = {
  id: string;
  value: string;
  weight: number;
};

function getItems(rule: FieldGenerationRule): Item[] {
  const cfg = (rule.config ?? {}) as any;
  const raw = Array.isArray(cfg.items) ? cfg.items : [];
  return raw.map((it: any, idx: number) => ({
    id: String(it.id ?? idx),
    value: String(it.value ?? ''),
    weight: typeof it.weight === 'number' ? it.weight : 1,
  }));
}

export function PickListConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: PickListConfigProps) {
  const store = useTestStore();
  const items = getItems(rule);

  const updateItems = (next: Item[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...(rule.config ?? {}),
        items: next.map((it) => ({ id: it.id, value: it.value, weight: it.weight })),
      } as any,
    });
  };

  const handleAdd = () => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    updateItems([...items, { id, value: '', weight: 1 }]);
  };

  const handleRemove = (id: string) => {
    updateItems(items.filter((it) => it.id !== id));
  };

  const handleValueChange = (id: string, value: string) => {
    updateItems(
      items.map((it) => (it.id === id ? { ...it, value } : it))
    );
  };

  const handleWeightChange = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) {
      updateItems(
        items.map((it) => (it.id === id ? { ...it, weight: 1 } : it))
      );
      return;
    }
    updateItems(
      items.map((it) => (it.id === id ? { ...it, weight: n } : it))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-sm)' }}>
      <div>
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          Add Item
        </Button>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: 'var(--radius-sm)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={item.value}
                onChange={(e) => handleValueChange(item.id, e.target.value)}
                placeholder="value"
                style={{
                  flex: '2 1 160px',
                  padding: '4px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="number"
                min={1}
                value={item.weight}
                onChange={(e) => handleWeightChange(item.id, e.target.value)}
                placeholder="weight"
                style={{
                  flex: '0 0 80px',
                  padding: '4px 8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRemove(item.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

