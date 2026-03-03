import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { TestType } from 'core/types';
import { Message } from '../../common';

const StandardMessage =
  'Your query runs against generated test data. Only unspecified fields use real Splunk data.';
const QueryOnlyMessage =
  'Your query runs directly against real Splunk data. No synthetic data injected.';

const CardGrid = styled.div`
  display: flex;
  gap: var(--radius-lg);
  flex-wrap: wrap;
`;

const ClickableCard = styled.div<{ $selected: boolean }>`
  cursor: pointer;
  min-width: 140px;
  flex: 1;
  padding: var(--radius-lg);
  border: 2px solid ${(p) => (p.$selected ? 'var(--accent)' : 'var(--border)')};
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  background: ${(p) => (p.$selected ? 'var(--bg-hover)' : 'var(--bg-card)')};
  transition: border-color 0.15s, background 0.15s;
  &:hover {
    border-color: var(--accent);
    background: var(--bg-hover);
  }
`;

export function TestTypeSelector() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const testType: TestType = activeTest?.testType ?? 'standard';

  const handleSelect = (type: TestType) => {
    if (activeTest) state.updateTestType(activeTest.id, type);
  };

  return (
    <section style={{ marginBottom: 'var(--radius-lg)' }}>
      <h2 style={{ fontSize: '1rem', marginBottom: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
        Test type
      </h2>
      <CardGrid>
        <ClickableCard $selected={testType === 'standard'} onClick={() => handleSelect('standard')}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--radius-sm)' }}>Standard</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Generated test data + real Splunk
          </div>
        </ClickableCard>
        <ClickableCard $selected={testType === 'query_only'} onClick={() => handleSelect('query_only')}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--radius-sm)' }}>Query only</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Run directly against real data
          </div>
        </ClickableCard>
      </CardGrid>
      <div style={{ marginTop: 'var(--radius-md)' }}>
        <Message type="info">
          {testType === 'standard' ? StandardMessage : QueryOnlyMessage}
        </Message>
      </div>
    </section>
  );
}
