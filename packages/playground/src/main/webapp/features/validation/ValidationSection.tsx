import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { ValidationType } from 'core/types';
import { Button, Message, Modal } from '../../common';
import { FieldConditionsGrid } from './FieldConditionsGrid';
import { IjumpValidation } from './IjumpValidation';

const ToggleRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  font-size: 0.8125rem;
  border-radius: var(--radius-md);
  border: 1px solid ${(p) => (p.$active ? 'var(--accent)' : 'var(--border)')};
  background: ${(p) => (p.$active ? 'var(--accent)' : 'transparent')};
  color: ${(p) => (p.$active ? '#1a1a2e' : 'var(--text-secondary)')};
  cursor: pointer;
  transition: var(--transition-fast);
  &:hover {
    background: ${(p) => (p.$active ? 'var(--accent-hover)' : 'rgba(0,212,255,0.08)')};
    color: var(--text-primary);
  }
`;

const SectionBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export function ValidationSection() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  if (!test) return null;

  const type: ValidationType = test.validation.validationType;

  const handleTypeChange = (next: ValidationType) => {
    if (next === type) return;
    state.setValidationType(test.id, next);
  };

  const messageText =
    type === 'standard'
      ? 'Define conditions per output field.'
      : 'Requires _time, reason, status.';

  const [clearModalOpen, setClearModalOpen] = React.useState(false);

  const handleClearAll = () => {
    if (!test) return;
    // Clear field conditions
    for (const cond of test.validation.fieldConditions) {
      state.removeFieldCondition(test.id, cond.id);
    }
    // Clear expected result JSON / file
    state.setExpectedResultJson(test.id, '');
    state.setExpectedResultFileRef(test.id, null);
    // Disable result count
    state.updateResultCount(test.id, { enabled: false, value: 0 });
    setClearModalOpen(false);
  };

  return (
    <SectionBody>
      <ToggleRow>
        <ToggleButton
          $active={type === 'standard'}
          onClick={() => handleTypeChange('standard')}
        >
          Standard
        </ToggleButton>
        <ToggleButton
          $active={type === 'ijump_alert'}
          onClick={() => handleTypeChange('ijump_alert')}
        >
          iJump Alert
        </ToggleButton>
      </ToggleRow>
      <Message type="info">{messageText}</Message>
      {type === 'standard' ? <FieldConditionsGrid /> : <IjumpValidation />}
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setClearModalOpen(true)}
          disabled={
            test.validation.fieldConditions.length === 0 &&
            (test.validation.expectedResultJson ?? '').trim() === '' &&
            !test.validation.expectedResultFileRef
          }
        >
          Clear all validation
        </Button>
      </div>
      <Modal
        open={clearModalOpen}
        title="Clear all validation?"
        onClose={() => setClearModalOpen(false)}
        confirmLabel="Clear"
        onConfirm={handleClearAll}
        variant="danger"
      >
        <p style={{ margin: 0 }}>
          This will remove all validation conditions and expected results. This cannot be
          undone.
        </p>
      </Modal>
    </SectionBody>
  );
}

