import React from 'react';
// TODO: Replace with @splunk/react-ui

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${checked ? 'bg-blue-300' : 'bg-slate-600'}`}
      >
        <span
          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-slate-100 shadow transition-[left] duration-200 ${checked ? 'left-5' : 'left-[2px]'}`}
        />
      </span>
      {label != null && <span className="text-sm text-slate-200">{label}</span>}
    </label>
  );
}
