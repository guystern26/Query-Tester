import React from 'react';
// TODO: Replace with @splunk/react-ui

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-navy-900 rounded-lg border border-slate-700 p-4 transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
}
