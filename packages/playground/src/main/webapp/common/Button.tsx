import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const sizeMap = {
  sm: { padding: '6px 12px', fontSize: '0.875rem' },
  md: { padding: '8px 16px', fontSize: '1rem' },
  lg: { padding: '10px 20px', fontSize: '1.125rem' },
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
}>`
  padding: ${(p) => sizeMap[p.$size].padding};
  font-size: ${(p) => sizeMap[p.$size].fontSize};
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.disabled ? 0.6 : 1)};
  transition: var(--transition-fast);

  ${(p) =>
    p.$variant === 'primary' &&
    `
    background-color: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
    box-shadow: var(--shadow-card);
    &:hover:not(:disabled) {
      background-color: var(--accent-hover);
      border-color: var(--accent-hover);
    }
  `}
  ${(p) =>
    p.$variant === 'secondary' &&
    `
    background-color: transparent;
    color: var(--accent);
    border-color: var(--accent);
    &:hover:not(:disabled) {
      background-color: rgba(0, 212, 255, 0.08);
    }
  `}
  ${(p) =>
    p.$variant === 'danger' &&
    `
    background-color: var(--error);
    color: white;
    border-color: var(--error);
    &:hover:not(:disabled) {
      filter: brightness(1.1);
    }
  `}
`;

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <StyledButton
      type="button"
      $variant={variant}
      $size={size}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </StyledButton>
  );
}
