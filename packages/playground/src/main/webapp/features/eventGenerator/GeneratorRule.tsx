import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, FieldGenerationRule, GeneratorType } from 'core/types';
import { Select, Button } from '../../common';
import { PickListConfig } from './configs/PickListConfig';
import { RandomNumberConfig } from './configs/RandomNumberConfig';
import { NumberedConfig } from './configs/NumberedConfig';
import { IpAddressConfig } from './configs/IpAddressConfig';
import { UniqueIdConfig } from './configs/UniqueIdConfig';
import { EmailConfig } from './configs/EmailConfig';
import { GeneralFieldConfig } from './configs/GeneralFieldConfig';

export interface GeneratorRuleProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  rule: FieldGenerationRule;
}

const typeOptions: { value: GeneratorType; label: string }[] = [
  { value: 'pick_list', label: 'Pick List — Random from weighted list' },
  { value: 'numbered', label: 'Numbered — Sequential' },
  { value: 'random_number', label: 'Random Number — Range with decimals' },
  { value: 'unique_id', label: 'Unique ID' },
  { value: 'email', label: 'Email' },
  { value: 'ip_address', label: 'IP Address' },
  { value: 'general_field', label: 'General — Custom' },
];

const typeHelp: Record<GeneratorType, string> = {
  pick_list: 'Values are picked at random from a weighted list you define.',
  numbered: 'Generates sequential numbers for each event.',
  random_number: 'Generates random numbers within a range (optionally with decimals).',
  unique_id: 'Generates unique identifiers per event.',
  email: 'Generates realistic email addresses.',
  ip_address: 'Generates IPv4 addresses.',
  general_field: 'Custom generator — configure behavior as needed.',
};

export function GeneratorRule({
  testId,
  scenarioId,
  inputId,
  rule,
}: GeneratorRuleProps) {
  const store = useTestStore();

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      field: e.target.value,
    });
  };

  const handleTypeChange = (value: string) => {
    if (!value) return;
    store.updateGeneratorRule(testId, scenarioId, inputId, rule.id, {
      type: value as GeneratorType,
      config: {},
    });
  };

  const handleDelete = () => {
    store.deleteGeneratorRule(testId, scenarioId, inputId, rule.id);
  };

  const selectOptions = [
    { value: '', label: 'Select type...' },
    ...typeOptions.map((opt) => ({ value: opt.value, label: opt.label })),
  ];

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--radius-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--radius-md)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 160px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: 4,
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            Field name
          </label>
          <input
            type="text"
            value={rule.field}
            onChange={handleFieldChange}
            placeholder="field name"
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

        <div style={{ flex: '1 1 220px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: 4,
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            Generation type
          </label>
          <Select
            value={rule.type || ''}
            options={selectOptions}
            onChange={handleTypeChange}
          />
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {rule.type && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ marginBottom: '4px' }}>{typeHelp[rule.type]}</div>
          {rule.type === 'pick_list' && (
            <PickListConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'random_number' && (
            <RandomNumberConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'numbered' && (
            <NumberedConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'ip_address' && (
            <IpAddressConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'unique_id' && (
            <UniqueIdConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'email' && (
            <EmailConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
          {rule.type === 'general_field' && (
            <GeneralFieldConfig
              testId={testId}
              scenarioId={scenarioId}
              inputId={inputId}
              rule={rule}
            />
          )}
        </div>
      )}
    </div>
  );
}

