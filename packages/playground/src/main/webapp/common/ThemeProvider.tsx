import React from 'react';
// TODO: Replace with @splunk/react-ui

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
