import React from 'react';
// TODO: Replace with @splunk/react-ui

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-300 hover:bg-blue-200 active:bg-blue-400 active:scale-[0.97] text-slate-900 border border-transparent shadow-sm active:shadow-none',
  secondary: 'bg-transparent border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200 active:scale-[0.97]',
  danger: 'bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-[0.97] text-white border border-transparent',
  ghost: 'text-slate-500 hover:text-slate-300 hover:bg-navy-800 active:scale-[0.97]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  'data-tutorial'?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  'data-tutorial': dataTutorial,
}: ButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-tutorial={dataTutorial}
      className={`font-semibold rounded-lg transition-all duration-200 ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  );
}
