import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, PickListItem } from 'core/types';
import { EmptyState } from '../../../common';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, vInputCls, vHeaderCls } from './VariantRow';

export interface PickListConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

function getItems(rule: FieldGenerationRule): PickListItem[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.items) ? c.items : [];
  return raw.map((it: any, i: number) => ({
    id: String(it.id ?? i),
    value: String(it.value ?? ''),
    weight: typeof it.weight === 'number' ? it.weight : 1,
  }));
}

export function PickListConfig({ testId, scenarioId, inputId, rule }: PickListConfigProps) {
  const store = useTestStore();
  const items = getItems(rule);

  const save = (next: PickListItem[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, items: next } as any,
    });
  };

  const handleValue = (id: string, value: string) => {
    save(items.map((it) => (it.id === id ? { ...it, value } : it)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(items.map((it) => (it.id === id ? { ...it, weight: n } : it))));
  };

  const handleAdd = () => save(normalizeWeights([...items, { id: genId(), value: '', weight: 1 }]));

  const handleRemove = (id: string) => {
    const next = items.filter((it) => it.id !== id);
    save(next.length > 0 ? normalizeWeights(next) : next);
  };

  return (
    <div className="mt-2">
      {items.length === 0 && (
        <EmptyState
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>}
          iconBg="bg-blue-900/30"
          title="No values yet"
          subtitle="Add your first value to the pick list."
          actionLabel="+ Add First Value"
          onAction={handleAdd}
        />
      )}
      {items.length > 0 && (
        <>
          <VHeader>
            <span className={`${vHeaderCls} flex-1`}>Value</span>
            <span className={`${vHeaderCls} w-14`}>Weight</span>
            <span className="w-5" />
          </VHeader>
          {items.map((item) => (
            <VRow key={item.id}>
              <input
                className={`${vInputCls} flex-1`}
                value={item.value}
                onChange={(e) => handleValue(item.id, e.target.value)}
                placeholder="value"
              />
              <VWeight value={item.weight} onChange={(v) => handleWeight(item.id, v)} />
              <VDelBtn disabled={items.length <= 1} onClick={() => handleRemove(item.id)} />
            </VRow>
          ))}
          <VAddBtn onClick={handleAdd} label="Add Item" />
        </>
      )}
    </div>
  );
}
