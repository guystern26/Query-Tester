import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--radius-md);
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: var(--radius-md) var(--radius-lg);
  background: ${(p) => (p.$active ? 'var(--bg-card)' : 'transparent')};
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? 'var(--accent)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--text-primary)' : 'var(--text-secondary)')};
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: -1px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: var(--transition-fast);
  &:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }
`;

const TabWithClose = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-bottom: -1px;
`;

const CloseBtn = styled.button`
  padding: 2px 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.125rem;
  line-height: 1;
  border-radius: var(--radius-sm);
  &:hover {
    color: var(--error);
    background: var(--bg-hover);
  }
`;

const AddBtn = styled.button`
  padding: var(--radius-md) var(--radius-lg);
  margin-bottom: -1px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.25rem;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  &:hover {
    color: var(--accent);
    background: var(--bg-hover);
  }
`;

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
}

export function Tabs({ tabs, activeId, onChange, onRemove, onAdd }: TabsProps) {
  return (
    <TabBar role="tablist">
      {tabs.map((tab) => (
        <TabWithClose key={tab.id}>
          <Tab
            role="tab"
            aria-selected={tab.id === activeId}
            $active={tab.id === activeId}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </Tab>
          {onRemove && (
            <CloseBtn
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tab.id);
              }}
              aria-label={`Remove ${tab.label}`}
            >
              ×
            </CloseBtn>
          )}
        </TabWithClose>
      ))}
      {onAdd && (
        <AddBtn type="button" onClick={onAdd} aria-label="Add tab">
          +
        </AddBtn>
      )}
    </TabBar>
  );
}
