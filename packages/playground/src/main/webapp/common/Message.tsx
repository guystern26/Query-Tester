import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

type MessageType = 'info' | 'warning' | 'error' | 'success';

const typeColors: Record<MessageType, string> = {
  info: 'var(--accent)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  success: 'var(--success)',
};

const Banner = styled.div<{ $type: MessageType }>`
  padding: var(--radius-md) var(--radius-lg);
  border-radius: var(--radius-md);
  border-left: 4px solid ${(p) => typeColors[p.$type]};
  background-color: var(--bg-card);
  color: var(--text-primary);
  display: flex;
  align-items: flex-start;
  gap: var(--radius-md);
  box-shadow: var(--shadow-card);
  transition: var(--transition-fast);
`;

const Content = styled.div`
  flex: 1;
`;

const DismissBtn = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0 4px;
  font-size: 1.25rem;
  line-height: 1;
  &:hover {
    color: var(--text-primary);
  }
`;

export interface MessageProps {
  type: MessageType;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHideMs?: number;
}

export function Message({
  type,
  children,
  dismissible = false,
  onDismiss,
  autoHideMs,
}: MessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible || autoHideMs == null) return;
    const id = setTimeout(() => setVisible(false), autoHideMs);
    return () => clearTimeout(id);
  }, [visible, autoHideMs]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <Banner $type={type}>
      <Content>{children}</Content>
      {dismissible && (
        <DismissBtn type="button" onClick={handleDismiss} aria-label="Dismiss">
          ×
        </DismissBtn>
      )}
    </Banner>
  );
}
