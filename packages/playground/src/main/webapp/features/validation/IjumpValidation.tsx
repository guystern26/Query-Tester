import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { ConditionOperator, EntityId } from 'core/types';
import { Message, Select } from '../../common';
import { FieldConditionsGrid } from './FieldConditionsGrid';

const LockedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const LockedLabel = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary);
  min-width: 80px;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
`;

export function IjumpValidation() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  if (!test) return null;

  // For now, locked rows are visual only. In a later iteration we can
  // synchronize them with dedicated FieldConditions.
  const lockedFields: Array<{ name: string; operator: ConditionOperator[] }> = [
    { name: '_time', operator: ['not_empty'] as ConditionOperator[] },
    { name: 'reason', operator: ['not_empty'] as ConditionOperator[] },
    { name: 'status', operator: ['not_empty'] as ConditionOperator[] },
  ];

  const allOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regex' },
    { value: 'not_empty', label: 'Is not empty' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Message type="warning">
        iJump Alert validation requires <code>_time</code>, <code>reason</code>, and{' '}
        <code>status</code> fields to be present in the results.
      </Message>

      <div>
        <SectionTitle>Required fields</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {lockedFields.map((f) => (
            <LockedRow key={f.name}>
              <LockedLabel>{f.name}</LockedLabel>
              <Select
                value={f.operator[0]}
                options={allOperators.map((o) => ({ value: o.value, label: o.label }))}
                onChange={() => {
                  /* locked; no-op for now */
                }}
              />
            </LockedRow>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Custom conditions</SectionTitle>
        <FieldConditionsGrid />
      </div>
    </div>
  );
}

