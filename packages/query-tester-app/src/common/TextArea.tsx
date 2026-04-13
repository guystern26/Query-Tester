import React from 'react';
// TODO: Replace with @splunk/react-ui

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function TextArea({ value, onChange, placeholder, disabled, rows = 4, style, className = '' }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={style}
      className={`w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}
