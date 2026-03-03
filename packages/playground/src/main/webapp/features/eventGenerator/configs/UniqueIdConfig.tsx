import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, UniqueIdVariant, UniqueIdFormat } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, vInputCls, vSelectCls, vHeaderCls } from './VariantRow';

export interface UniqueIdConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const FORMAT_OPTIONS: { value: UniqueIdFormat; label: string }[] = [
  { value: 'uuid', label: 'UUID (550e8400-e29b...)' },
  { value: 'sequential', label: 'Sequential (1, 2, 3...)' },
  { value: 'alphanumeric', label: 'Alphanumeric (aB3xK9)' },
  { value: 'numeric', label: 'Numeric (48291)' },
  { value: 'hex', label: 'Hex (a1f3e8)' },
];

function getVariants(rule: FieldGenerationRule): UniqueIdVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => ({
    id: String(v.id ?? i),
    format: (['uuid', 'sequential', 'alphanumeric', 'numeric', 'hex'].includes(v.format) ? v.format : 'uuid') as UniqueIdFormat,
    prefix: String(v.prefix ?? ''),
    suffix: String(v.suffix ?? ''),
    length: typeof v.length === 'number' ? v.length : 8,
    weight: typeof v.weight === 'number' ? v.weight : 1,
  }));
}

export function UniqueIdConfig({ testId, scenarioId, inputId, rule }: UniqueIdConfigProps) {
  const store = useTestStore();
  const variants = getVariants(rule);

  const save = (next: UniqueIdVariant[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, variants: next } as any,
    });
  };

  const update = (id: string, patch: Partial<UniqueIdVariant>) => {
    save(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    save(normalizeWeights([...variants, { id: genId(), format: 'uuid' as UniqueIdFormat, prefix: '', suffix: '', length: 8, weight: 1 }]));
  };

  const handleRemove = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    save(next.length > 0 ? normalizeWeights(next) : next);
  };

  return (
    <div className="mt-2">
      {variants.length > 0 && (
        <VHeader>
          <span className={`${vHeaderCls} w-40`}>Format</span>
          <span className={`${vHeaderCls} w-14`}>Prefix</span>
          <span className={`${vHeaderCls} w-14`}>Suffix</span>
          <span className={`${vHeaderCls} w-10`}>Len</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => (
        <VRow key={v.id}>
          <select className={`${vSelectCls} w-40`} value={v.format} onChange={(e) => update(v.id, { format: e.target.value as UniqueIdFormat })}>
            {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className={`${vInputCls} w-14`} value={v.prefix} onChange={(e) => update(v.id, { prefix: e.target.value })} placeholder="prefix" />
          <input className={`${vInputCls} w-14`} value={v.suffix} onChange={(e) => update(v.id, { suffix: e.target.value })} placeholder="suffix" />
          <input type="number" className={`${vInputCls} w-10`} min={1} value={v.length} onChange={(e) => update(v.id, { length: Number(e.target.value) || 1 })} />
          <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
          <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
        </VRow>
      ))}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
    </div>
  );
}
