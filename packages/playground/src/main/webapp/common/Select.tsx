import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const StyledSelect = styled.select`
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--radius-sm) var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  min-width: 120px;
  cursor: pointer;
  transition: var(--transition-fast);
  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  option {
    background: var(--bg-card);
    color: var(--text-primary);
  }
`;

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Select({ value, options, onChange, disabled }: SelectProps) {
  return (
    <StyledSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </StyledSelect>
  );
}
