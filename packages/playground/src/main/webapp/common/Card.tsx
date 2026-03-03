import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const StyledCard = styled.div`
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: var(--transition-fast);
`;

export interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps) {
  return <StyledCard>{children}</StyledCard>;
}
