import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule } from 'core/types';
import { Select } from '../../../common';

export interface IpAddressConfigProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const ipTypeOptions = [
  { value: 'private_a', label: 'Private A (10.0.0.0/8)' },
  { value: 'private_b', label: 'Private B (172.16.0.0/12)' },
  { value: 'private_c', label: 'Private C (192.168.0.0/16)' },
  { value: 'public_ipv4', label: 'Public IPv4' },
];

export function IpAddressConfig({
  testId,
  scenarioId,
  inputId,
  rule,
}: IpAddressConfigProps) {
  const store = useTestStore();
  const cfg = (rule.config ?? {}) as any;
  const ipType: string = typeof cfg.ipType === 'string' ? cfg.ipType : '';

  const handleChange = (value: string) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      config: {
        ...cfg,
        ipType: value,
      } as any,
    });
  };

  const options = [{ value: '', label: 'Select IP range...' }, ...ipTypeOptions];

  return (
    <div style={{ marginTop: '4px', maxWidth: 260 }}>
      <Select value={ipType} options={options} onChange={handleChange} />
    </div>
  );
}

