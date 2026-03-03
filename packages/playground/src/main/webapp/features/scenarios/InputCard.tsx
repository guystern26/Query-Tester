import React from 'react';
import styled from 'styled-components';
import type { TestInput, InputMode } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import type { EntityId } from 'core/types';
import { Card, Button, Message } from '../../common';
import { FieldValueEditor } from '../../components/inputs/FieldValueEditor';
import { JsonInputView } from '../../components/inputs/JsonInputView';
import { GeneratorPanel } from '../eventGenerator/GeneratorPanel';

const MODE_MESSAGES: Record<InputMode, string> = {
  fields: 'Fill field names and values manually.',
  json: 'Paste raw JSON. Each object becomes one event.',
  no_events: 'Returns 0 events. Tests empty data source.',
};

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
`;

const Title = styled.span`
  font-weight: 600;
  font-size: 0.9375rem;
`;

const RowIdentifierBlock = styled.div`
  margin-bottom: 12px;
`;

const RowIdentifierLabel = styled.label`
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const RowIdentifierInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition-fast);
  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
`;

const ToggleBar = styled.div`
  display: inline-flex;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0b1a33;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  font-size: 0.8125rem;
  border: none;
  min-width: 80px;
  cursor: pointer;
  color: ${(p) => (p.$active ? '#1a1a2e' : 'var(--text-secondary)')};
  background: ${(p) => (p.$active ? 'var(--accent)' : 'transparent')};
  transition: var(--transition-fast);
  &:hover {
    background: ${(p) => (p.$active ? 'var(--accent-hover)' : 'rgba(0,212,255,0.08)')};
    color: var(--text-primary);
  }
  &:not(:last-child) {
    border-right: 1px solid var(--border);
  }
`;

const ToggleRow = styled.div`
  margin-bottom: 12px;
`;

const ContentArea = styled.div``;

export interface InputCardProps {
  testId: EntityId;
  scenarioId: EntityId;
  input: TestInput;
  index?: number;
}

export function InputCard({ testId, scenarioId, input, index }: InputCardProps) {
  const state = useTestStore();

  const setMode = (mode: InputMode) => {
    state.setInputMode(testId, scenarioId, input.id, mode);
  };

  const handleRowIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    state.updateRowIdentifier(testId, scenarioId, input.id, e.target.value);
  };

  const handleDelete = () => {
    state.deleteInput(testId, scenarioId, input.id);
  };

  const title = input.rowIdentifier.trim() || `Input ${index ?? ''}`.trim() || 'Input';

  return (
    <Card>
      <HeaderRow>
        <Title>{title}</Title>
        <Button variant="danger" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      </HeaderRow>

      <RowIdentifierBlock>
        <RowIdentifierLabel>Row identifier</RowIdentifierLabel>
        <RowIdentifierInput
          type="text"
          value={input.rowIdentifier}
          onChange={handleRowIdChange}
          placeholder="e.g., index=main sourcetype=access_combined"
        />
      </RowIdentifierBlock>

      <ToggleRow>
        <ToggleBar>
          <ToggleButton
            $active={input.inputMode === 'fields'}
            onClick={() => setMode('fields')}
          >
            Fields
          </ToggleButton>
          <ToggleButton
            $active={input.inputMode === 'json'}
            onClick={() => setMode('json')}
          >
            JSON
          </ToggleButton>
          <ToggleButton
            $active={input.inputMode === 'no_events'}
            onClick={() => setMode('no_events')}
          >
            No Events
          </ToggleButton>
        </ToggleBar>
        <div style={{ marginTop: 8 }}>
          <Message type="info">{MODE_MESSAGES[input.inputMode]}</Message>
        </div>
      </ToggleRow>

      <ContentArea>
        {input.inputMode === 'fields' && (
          <>
            <FieldValueEditor
              testId={testId}
              scenarioId={scenarioId}
              inputId={input.id}
              events={input.events}
            />
            <div style={{ marginTop: 12 }}>
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 8,
                  }}
                >
                  Event Generator (generate more events automatically)
                </summary>
                <GeneratorPanel testId={testId} scenarioId={scenarioId} inputId={input.id} />
              </details>
            </div>
          </>
        )}
        {input.inputMode === 'json' && (
          <JsonInputView testId={testId} scenarioId={scenarioId} inputId={input.id} />
        )}
        {input.inputMode === 'no_events' && (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            No event data. This input will contribute zero events to the test.
          </p>
        )}
      </ContentArea>
    </Card>
  );
}
