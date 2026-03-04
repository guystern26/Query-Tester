import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, IpAddressVariant, IpType } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, vInputCls, vSelectCls, vHeaderCls } from './VariantRow';

export interface IpAddressConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const IP_OPTIONS: { value: IpType; label: string }[] = [
  { value: 'ipv4', label: 'IPv4 (random)' },
  { value: 'ipv6', label: 'IPv6 (random)' },
  { value: 'private_a', label: 'Private A (10.x.x.x)' },
  { value: 'private_b', label: 'Private B (172.16.x.x)' },
  { value: 'private_c', label: 'Private C (192.168.x.x)' },
];

function getVariants(rule: FieldGenerationRule): IpAddressVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => ({
    id: String(v.id ?? i),
    ipType: (['ipv4', 'ipv6', 'private_a', 'private_b', 'private_c'].includes(v.ipType) ? v.ipType : 'ipv4') as IpType,
    prefix: String(v.prefix ?? ''),
    suffix: String(v.suffix ?? ''),
    weight: typeof v.weight === 'number' ? v.weight : 1,
  }));
}

export function IpAddressConfig({ testId, scenarioId, inputId, rule }: IpAddressConfigProps) {
  const store = useTestStore();
  const variants = getVariants(rule);

  const save = (next: IpAddressVariant[]) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: { ...rule.config, variants: next } as any,
    });
  };

  const update = (id: string, patch: Partial<IpAddressVariant>) => {
    save(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    save(normalizeWeights([...variants, { id: genId(), ipType: 'ipv4' as IpType, prefix: '', suffix: '', weight: 1 }]));
  };

  const handleRemove = (id: string) => {
    const next = variants.filter((v) => v.id !== id);
    save(next.length > 0 ? normalizeWeights(next) : next);
  };

  return (
    <div className="mt-2">
      {variants.length > 0 && (
        <VHeader>
          <span className={`${vHeaderCls} w-40`}>Type</span>
          <span className={`${vHeaderCls} w-16`}>Prefix</span>
          <span className={`${vHeaderCls} w-16`}>Suffix</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => (
        <VRow key={v.id}>
          <select className={`${vSelectCls} w-40`} value={v.ipType} onChange={(e) => update(v.id, { ipType: e.target.value as IpType })}>
            {IP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className={`${vInputCls} w-16`} value={v.prefix} onChange={(e) => update(v.id, { prefix: e.target.value })} placeholder="prefix" />
          <input className={`${vInputCls} w-16`} value={v.suffix} onChange={(e) => update(v.id, { suffix: e.target.value })} placeholder="suffix" />
          <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
          <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
        </VRow>
      ))}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
    </div>
  );
}
