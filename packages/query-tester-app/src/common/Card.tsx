import React from 'react';
// TODO: Replace with @splunk/react-ui

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-navy-800 rounded-lg border border-slate-700 p-4 shadow-sm transition-all duration-200 hover:border-slate-600 ${className}`}>
      {children}
    </div>
  );
}
