import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { ConditionOperator, EntityId, ResultCountOperator } from 'core/types';
import { MAX_FIELD_CONDITIONS } from 'core/constants/limits';
import { Button, Select, Switch, Message } from '../../common';

const GridRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const FieldInput = styled.input`
  flex: 1 1 140px;
  min-width: 0;
  padding: 6px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  box-sizing: border-box;
  transition: var(--transition-fast);
  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
`;

const ValueInput = styled(FieldInput)`
  flex: 1 1 160px;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
`;

const ResultCountBox = styled.div`
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SmallLabel = styled.span`
  font-size: 0.8125rem;
  color: var(--text-secondary);
`;

export function FieldConditionsGrid() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  if (!test) return null;

  const conditions = test.validation.fieldConditions;
  const scenarios = test.scenarios;
  const resultCount = test.validation.resultCount;

  const operatorOptions: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regex' },
    { value: 'not_empty', label: 'Is not empty' },
  ];

  const resultOperatorOptions: { value: ResultCountOperator; label: string }[] = [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
  ];

  const scenarioOptions = [
    { value: 'all', label: 'All scenarios' },
    ...scenarios.map((s) => ({ value: s.id, label: s.name || 'Untitled scenario' })),
  ];

  const handleAddCondition = () => {
    if (conditions.length >= MAX_FIELD_CONDITIONS) return;
    state.addFieldCondition(test.id);
  };

  const handleDeleteCondition = (id: EntityId) => {
    state.removeFieldCondition(test.id, id);
  };

  const handleFieldChange = (id: EntityId, field: string) => {
    state.updateFieldCondition(test.id, id, { field });
  };

  const handleOperatorChange = (id: EntityId, op: ConditionOperator) => {
    state.updateFieldCondition(test.id, id, { operator: op });
  };

  const handleValueChange = (id: EntityId, value: string) => {
    state.updateFieldCondition(test.id, id, { value });
  };

  const handleScopeChange = (id: EntityId, scope: string) => {
    if (scope === 'all') {
      state.updateFieldCondition(test.id, id, { scenarioScope: 'all' });
    } else {
      state.updateFieldCondition(test.id, id, { scenarioScope: [scope] as EntityId[] });
    }
  };

  const handleResultToggle = (enabled: boolean) => {
    state.updateResultCount(test.id, { enabled });
  };

  const handleResultOperatorChange = (op: ResultCountOperator) => {
    state.updateResultCount(test.id, { operator: op });
  };

  const handleResultValueChange = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      state.updateResultCount(test.id, { value: n });
    }
  };

  return (
    <GridRoot>
      <SectionTitle>Field conditions</SectionTitle>
      {conditions.length === 0 && (
        <Message type="info">Add conditions to validate individual fields.</Message>
      )}
      {conditions.map((cond) => {
        const scopeValue =
          cond.scenarioScope === 'all'
            ? 'all'
            : cond.scenarioScope.length > 0
            ? cond.scenarioScope[0]
            : 'all';
        const showValue = cond.operator !== 'not_empty';

        return (
          <Row key={cond.id}>
            <FieldInput
              type="text"
              value={cond.field}
              onChange={(e) => handleFieldChange(cond.id, e.target.value)}
              placeholder="e.g., count, src_ip, status"
            />
            <Select
              value={cond.operator}
              options={operatorOptions.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => handleOperatorChange(cond.id, v as ConditionOperator)}
            />
            {showValue && (
              <ValueInput
                type="text"
                value={cond.value}
                onChange={(e) => handleValueChange(cond.id, e.target.value)}
                placeholder="expected value"
              />
            )}
            <Select
              value={scopeValue}
              options={scenarioOptions}
              onChange={(v) => handleScopeChange(cond.id, v)}
            />
            <button
              type="button"
              onClick={() => handleDeleteCondition(cond.id)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.875rem',
              }}
              aria-label="Delete condition"
            >
              ×
            </button>
          </Row>
        );
      })}
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAddCondition}
          disabled={conditions.length >= MAX_FIELD_CONDITIONS}
        >
          Add Condition
        </Button>
      </div>

      <ResultCountBox>
        <SectionTitle>Result count</SectionTitle>
        <Row>
          <Switch
            checked={resultCount.enabled}
            onChange={handleResultToggle}
            label="Enable result count check"
          />
        </Row>
        {resultCount.enabled && (
          <Row>
            <div>
              <SmallLabel>Operator</SmallLabel>
              <Select
                value={resultCount.operator}
                options={resultOperatorOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                onChange={(v) => handleResultOperatorChange(v as ResultCountOperator)}
              />
            </div>
            <div>
              <SmallLabel>Value</SmallLabel>
              <FieldInput
                type="number"
                value={resultCount.value}
                onChange={(e) => handleResultValueChange(e.target.value)}
                placeholder="expected value"
              />
            </div>
          </Row>
        )}
      </ResultCountBox>
    </GridRoot>
  );
}

