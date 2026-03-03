import React, { useRef } from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { Button } from '../../common';
import { TestNavigation } from './TestNavigation';
import { BugReportButton } from './BugReportButton';

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 48px;
  background: #16213e;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export function TopBar() {
  const state = useTestStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => state.saveToFile();

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(
      (content) => {
        const result = state.loadFromFile(content);
        if (!result.success) {
          alert(result.error ?? 'Failed to load file');
        }
      },
      () => alert('Failed to read file')
    );
    e.target.value = '';
  };

  return (
    <Bar>
      <LeftGroup>
        <Button variant="secondary" size="sm" onClick={handleSave}>
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={handleLoadClick}>
          Load
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
        <BugReportButton />
      </LeftGroup>
      <TestNavigation />
    </Bar>
  );
}
