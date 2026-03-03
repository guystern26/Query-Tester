import React from 'react';
import styled from 'styled-components';
import type { ScenarioResult, FieldValidationResult } from 'core/types';
import { Card } from '../../common';

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const Name = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
`;

const Badge = styled.span<{ $passed: boolean }>`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${(p) => (p.$passed ? 'rgba(34,197,94,0.16)' : 'rgba(248,113,113,0.16)')};
  color: ${(p) => (p.$passed ? '#4ade80' : '#fca5a5')};
`;

const InputBlock = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EventBlock = styled.div`
  padding: 6px 8px;
  border-radius: var(--radius-md);
  background: rgba(15, 52, 96, 0.6);
`;

const FieldRow = styled.div<{ $passed: boolean }>`
  font-size: 0.8125rem;
  color: ${(p) => (p.$passed ? '#4ade80' : '#fca5a5')};
  margin-bottom: 2px;
`;

const Label = styled.span`
  color: var(--text-secondary);
`;

function renderValues(label: string, value?: string) {
  if (!value) return null;
  const parts = value.split('\n');
  return (
    <div>
      <Label>{label}: </Label>
      {parts.map((p, idx) => (
        <div key={idx}>{p}</div>
      ))}
    </div>
  );
}

export interface ScenarioResultCardProps {
  result: ScenarioResult;
}

export function ScenarioResultCard({ result }: ScenarioResultCardProps) {
  return (
    <Card>
      <HeaderRow>
        <Name>{result.scenarioName || 'Unnamed scenario'}</Name>
        <Badge $passed={result.passed}>{result.passed ? 'Passed' : 'Failed'}</Badge>
      </HeaderRow>

      {result.inputResults.map((inputResult, inputIndex) => (
        <InputBlock key={inputResult.inputId}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Input {inputIndex + 1} ·{' '}
            <span style={{ color: inputResult.passed ? '#4ade80' : '#fca5a5' }}>
              {inputResult.passed ? 'Passed' : 'Failed'}
            </span>
          </div>
          {inputResult.eventResults.map((eventResult) => (
            <EventBlock key={eventResult.eventIndex}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  marginBottom: 4,
                  color: eventResult.passed ? '#4ade80' : '#fca5a5',
                }}
              >
                Event {eventResult.eventIndex + 1}{' '}
                {eventResult.error && (
                  <span style={{ color: '#fca5a5' }}>— {eventResult.error}</span>
                )}
              </div>
              {eventResult.fieldValidations.map((fv: FieldValidationResult) => (
                <FieldRow key={fv.field} $passed={fv.passed}>
                  <strong>{fv.field}</strong>{' '}
                  {fv.message && <span>— {fv.message}</span>}
                  {!fv.passed && (
                    <div style={{ marginLeft: 8 }}>
                      {renderValues('Expected', fv.expected)}
                      {renderValues('Actual', fv.actual)}
                    </div>
                  )}
                </FieldRow>
              ))}
            </EventBlock>
          ))}
        </InputBlock>
      ))}
    </Card>
  );
}

