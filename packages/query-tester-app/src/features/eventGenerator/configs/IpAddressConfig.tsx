import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, IpAddressVariant, IpType } from 'core/types';
import { normalizeWeights, genId } from '../utils/normalizeWeights';
import { VHeader, VRow, VWeight, VDelBtn, VAddBtn, vSelectCls, vHeaderCls } from './VariantRow';
import { OctetInput } from './OctetInput';

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

/** Default octets for each IP type. */
function defaultOctets(ipType: IpType): (number | '')[] {
  switch (ipType) {
    case 'private_a':  return [10, '', '', ''];
    case 'private_b':  return [172, 16, '', ''];
    case 'private_c':  return [192, 168, '', ''];
    case 'ipv6':       return ['', '', '', '', '', ''];
    case 'ipv4':
    default:           return ['', '', '', ''];
  }
}

/** Which octets are locked (non-editable) for each private range. */
function lockedOctets(ipType: IpType): boolean[] {
  switch (ipType) {
    case 'private_a':  return [true, false, false, false];
    case 'private_b':  return [true, true, false, false];
    case 'private_c':  return [true, true, false, false];
    default:           return [];
  }
}

/** Ensure customOctets has correct length for the IP type. */
function ensureOctets(octets: (number | '')[] | undefined, ipType: IpType): (number | '')[] {
  const defaults = defaultOctets(ipType);
  if (!octets || octets.length !== defaults.length) return defaults;
  // Enforce locked positions from defaults
  const locked = lockedOctets(ipType);
  return octets.map((v, i) => locked[i] ? defaults[i] : v);
}

function getVariants(rule: FieldGenerationRule): IpAddressVariant[] {
  const c = rule.config as any;
  const raw = Array.isArray(c?.variants) ? c.variants : [];
  return raw.map((v: any, i: number) => {
    const ipType = (['ipv4', 'ipv6', 'private_a', 'private_b', 'private_c'].includes(v.ipType) ? v.ipType : 'ipv4') as IpType;
    return {
      id: String(v.id ?? i),
      ipType,
      prefix: String(v.prefix ?? ''),
      suffix: String(v.suffix ?? ''),
      weight: typeof v.weight === 'number' ? v.weight : 1,
      customOctets: ensureOctets(v.customOctets, ipType),
    };
  });
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

  const handleTypeChange = (id: string, ipType: IpType) => {
    // Reset octets to defaults when type changes
    update(id, { ipType, customOctets: defaultOctets(ipType) });
  };

  const handleOctetChange = (id: string, octets: (number | '')[]) => {
    update(id, { customOctets: octets });
  };

  const handleWeight = (id: string, raw: string) => {
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    save(normalizeWeights(variants.map((v) => (v.id === id ? { ...v, weight: n } : v))));
  };

  const handleAdd = () => {
    const ipType: IpType = 'ipv4';
    save(normalizeWeights([
      ...variants,
      { id: genId(), ipType, prefix: '', suffix: '', weight: 1, customOctets: defaultOctets(ipType) },
    ]));
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
          <span className={`${vHeaderCls} flex-1`}>Range</span>
          <span className={`${vHeaderCls} w-14`}>Weight</span>
          <span className="w-5" />
        </VHeader>
      )}
      {variants.map((v) => {
        const octets = ensureOctets(v.customOctets, v.ipType);
        const locked = lockedOctets(v.ipType);
        const sep = v.ipType === 'ipv6' ? ':' as const : '.' as const;

        return (
          <VRow key={v.id}>
            <select
              className={`${vSelectCls} w-40`}
              value={v.ipType}
              onChange={(e) => handleTypeChange(v.id, e.target.value as IpType)}
            >
              {IP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex-1 min-w-0">
              <OctetInput
                octets={octets}
                onChange={(next) => handleOctetChange(v.id, next)}
                locked={locked}
                separator={sep}
              />
            </div>
            <VWeight value={v.weight} onChange={(raw) => handleWeight(v.id, raw)} />
            <VDelBtn disabled={variants.length <= 1} onClick={() => handleRemove(v.id)} />
          </VRow>
        );
      })}
      <VAddBtn onClick={handleAdd} label="Add Variant" />
      <p className="text-[10px] text-slate-600 italic m-0 mt-1">
        Fill octets to fix them, leave empty (*) to randomize
      </p>
    </div>
  );
}
