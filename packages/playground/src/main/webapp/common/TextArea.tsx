import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const StyledTextArea = styled.textarea`
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  min-height: 80px;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
  transition: var(--transition-fast);
  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  &::placeholder {
    color: var(--text-muted);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  style?: React.CSSProperties;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 4,
  style,
}: TextAreaProps) {
  return (
    <StyledTextArea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={style}
    />
  );
}
