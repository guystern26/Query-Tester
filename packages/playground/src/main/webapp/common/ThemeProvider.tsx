import React from 'react';
// TODO: Replace with @splunk/react-ui
import '../pages/start/tokens.css';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
