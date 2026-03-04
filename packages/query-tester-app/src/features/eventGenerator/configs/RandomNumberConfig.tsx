import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, RandomNumberVariant } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, VHelper, vInputCls, vHeaderCls } from './VariantRow';

export interface RandomNumberConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

function getVariants(rule: FieldGenerationRule): RandomNumberVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => ({
    id: String(v.id ?? i),
    min: typeof v.min === 'number' ? v.min : 0,
    max: typeof v.max === 'number' ? v.max : 100,
    decimals: typeof v.decimals === 'number' ? v.decimals : 0,
    prefix: String(v.prefix ?? ''),
    suffix: String(v.suffix ?? ''),
    weight: typeof v.weight === 'number' ? v.weight : 1,
  }));
}

export function RandomNumberConfig({ testId, scenarioId, inputId, rule }: RandomNumberConfigProps) {
  const store = useTestStore();
  const variants = getVariants(rule);

  const save = (next: RandomNumberVariant[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, variants: next } as any,
    });
  };

  const update = (id: string, patch: Partial<RandomNumberVariant>) => {
    save(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    save(normalizeWeights([...variants, { id: genId(), min: 0, max: 100, decimals: 0, prefix: '', suffix: '', weight: 1 }]));
  };

  const handleRemove = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    save(next.length > 0 ? normalizeWeights(next) : next);
  };

  return (
    <div className="mt-2">
      {variants.length > 0 && (
        <VHeader>
          <span className={`${vHeaderCls} w-14`}>Min</span>
          <span className={`${vHeaderCls} w-14`}>Max</span>
          <span className={`${vHeaderCls} w-10`}>Dec</span>
          <span className={`${vHeaderCls} w-14`}>Prefix</span>
          <span className={`${vHeaderCls} w-14`}>Suffix</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => (
        <VRow key={v.id}>
          <input type="number" className={`${vInputCls} w-14`} value={v.min} onChange={(e) => update(v.id, { min: Number(e.target.value) || 0 })} placeholder="0" />
          <input type="number" className={`${vInputCls} w-14`} value={v.max} onChange={(e) => update(v.id, { max: Number(e.target.value) || 0 })} placeholder="100" />
          <input type="number" className={`${vInputCls} w-10`} min={0} max={10} value={v.decimals} onChange={(e) => update(v.id, { decimals: Math.min(Number(e.target.value) || 0, 10) })} placeholder="0" />
          <input className={`${vInputCls} w-14`} value={v.prefix} onChange={(e) => update(v.id, { prefix: e.target.value })} placeholder="$" />
          <input className={`${vInputCls} w-14`} value={v.suffix} onChange={(e) => update(v.id, { suffix: e.target.value })} placeholder="USD" />
          <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
          <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
        </VRow>
      ))}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
      <VHelper>Example: prefix=&quot;$&quot; suffix=&quot;USD&quot; → $542USD</VHelper>
    </div>
  );
}
