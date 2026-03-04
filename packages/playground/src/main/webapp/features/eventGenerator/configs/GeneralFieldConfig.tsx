import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, GeneralFieldVariant, GeneralComponentType } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, VHelper, vInputCls, vSelectCls, vHeaderCls } from './VariantRow';

export interface GeneralFieldConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const COMP_OPTIONS: { value: GeneralComponentType; label: string }[] = [
  { value: 'alphanumeric', label: 'String (aB3x)' },
  { value: 'numeric', label: 'Numeric (1234)' },
];

function getVariants(rule: FieldGenerationRule): GeneralFieldVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => ({
    id: String(v.id ?? i),
    prefix: String(v.prefix ?? ''),
    suffix: String(v.suffix ?? ''),
    componentType: (['alphanumeric', 'numeric', 'alpha', 'hex'].includes(v.componentType) ? v.componentType : 'alphanumeric') as GeneralComponentType,
    componentLength: typeof v.componentLength === 'number' ? v.componentLength : 6,
    weight: typeof v.weight === 'number' ? v.weight : 1,
  }));
}

export function GeneralFieldConfig({ testId, scenarioId, inputId, rule }: GeneralFieldConfigProps) {
  const store = useTestStore();
  const variants = getVariants(rule);

  const save = (next: GeneralFieldVariant[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, variants: next } as any,
    });
  };

  const update = (id: string, patch: Partial<GeneralFieldVariant>) => {
    save(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    save(normalizeWeights([...variants, {
      id: genId(), prefix: '', suffix: '', componentType: 'alphanumeric' as GeneralComponentType, componentLength: 6, weight: 1,
    }]));
  };

  const handleRemove = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    save(next.length > 0 ? normalizeWeights(next) : next);
  };

  return (
    <div className="mt-2">
      {variants.length > 0 && (
        <VHeader>
          <span className={`${vHeaderCls} w-32`}>Type</span>
          <span className={`${vHeaderCls} w-10`}>Len</span>
          <span className={`${vHeaderCls} w-16`}>Prefix</span>
          <span className={`${vHeaderCls} w-16`}>Suffix</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => (
        <VRow key={v.id}>
          <select className={`${vSelectCls} w-32`} value={v.componentType} onChange={(e) => update(v.id, { componentType: e.target.value as GeneralComponentType })}>
            {COMP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={1} className={`${vInputCls} w-10`} value={v.componentLength} onChange={(e) => update(v.id, { componentLength: Number(e.target.value) || 1 })} />
          <input className={`${vInputCls} w-16`} value={v.prefix} onChange={(e) => update(v.id, { prefix: e.target.value })} placeholder="prefix" />
          <input className={`${vInputCls} w-16`} value={v.suffix} onChange={(e) => update(v.id, { suffix: e.target.value })} placeholder="suffix" />
          <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
          <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
        </VRow>
      ))}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
      <VHelper>Format: {'{prefix}{random}{suffix}'} → user_aB3xK9_prod</VHelper>
    </div>
  );
}
