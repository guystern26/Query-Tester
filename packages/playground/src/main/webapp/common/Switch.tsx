import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const Label = styled.label`
  display: inline-flex;
  align-items: center;
  gap: var(--radius-md);
  cursor: pointer;
  color: var(--text-primary);
  user-select: none;
`;

const Track = styled.span<{ $checked: boolean; $disabled?: boolean }>`
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${(p) =>
    p.$disabled ? 'var(--border)' : p.$checked ? 'var(--accent)' : 'var(--border-light)'};
  position: relative;
  transition: background 0.2s;
  opacity: ${(p) => (p.$disabled ? 0.6 : 1)};
  &::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${(p) => (p.$checked ? '20px' : '2px')};
    transition: left 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <Label>
      <HiddenInput
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <Track $checked={checked} $disabled={disabled} />
      {label != null && <span>{label}</span>}
    </Label>
  );
}
