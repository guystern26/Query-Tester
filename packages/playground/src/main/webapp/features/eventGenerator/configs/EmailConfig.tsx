import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, EmailVariant, EmailComponentType } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, VHelper, vInputCls, vSelectCls, vHeaderCls } from './VariantRow';

export interface EmailConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

function getVariants(rule: FieldGenerationRule): EmailVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => ({
    id: String(v.id ?? i),
    localPart: String(v.localPart ?? ''),
    domain: String(v.domain ?? ''),
    componentType: (v.componentType === 'string' ? 'string' : 'numeric') as EmailComponentType,
    componentLength: typeof v.componentLength === 'number' ? v.componentLength : 4,
    weight: typeof v.weight === 'number' ? v.weight : 1,
  }));
}

export function EmailConfig({ testId, scenarioId, inputId, rule }: EmailConfigProps) {
  const store = useTestStore();
  const variants = getVariants(rule);

  const save = (next: EmailVariant[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, variants: next } as any,
    });
  };

  const update = (id: string, patch: Partial<EmailVariant>) => {
    save(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    save(normalizeWeights([...variants, {
      id: genId(), localPart: '', domain: '', componentType: 'numeric' as EmailComponentType, componentLength: 4, weight: 1,
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
          <span className={`${vHeaderCls} w-20`}>Type</span>
          <span className={`${vHeaderCls} w-10`}>Len</span>
          <span className={`${vHeaderCls} w-16`}>Local</span>
          <span className="w-3" />
          <span className={`${vHeaderCls} flex-1`}>Domain</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => (
        <VRow key={v.id}>
          <select className={`${vSelectCls} w-20`} value={v.componentType} onChange={(e) => update(v.id, { componentType: e.target.value as EmailComponentType })}>
            <option value="numeric">Numeric</option>
            <option value="string">String</option>
          </select>
          <input type="number" min={1} max={20} className={`${vInputCls} w-10`} value={v.componentLength} onChange={(e) => update(v.id, { componentLength: Math.min(Number(e.target.value) || 1, 20) })} />
          <input className={`${vInputCls} w-16`} value={v.localPart} onChange={(e) => update(v.id, { localPart: e.target.value })} placeholder="user" />
          <span className="text-accent-400 font-bold text-sm w-3 text-center flex-shrink-0">@</span>
          <input className={`${vInputCls} flex-1`} value={v.domain} onChange={(e) => update(v.id, { domain: e.target.value })} placeholder="example.com" />
          <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
          <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
        </VRow>
      ))}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
      <VHelper>Format: {'{localPart}{random}@{domain}'} → user1234@example.com</VHelper>
    </div>
  );
}
