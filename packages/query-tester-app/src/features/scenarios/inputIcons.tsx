import React from 'react';
import type { InputMode } from 'core/types';

export const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

export const JsonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H6a2 2 0 0 0-2 2v2m0 6v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m0 6v2a2 2 0 0 1-2 2h-2" />
  </svg>
);

export const NoEventsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><line x1="5" y1="5" x2="19" y2="19" />
  </svg>
);

export const QueryDataIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

export const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-90' : ''}`}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const MODE_LABELS: Record<InputMode, string> = {
  fields: 'Fields', json: 'JSON', no_events: 'No Events', query_data: 'Query Data',
};

export const INPUT_MODES: { key: InputMode; label: string; Icon: React.FC }[] = [
  { key: 'fields', label: 'Fields', Icon: GridIcon },
  { key: 'json', label: 'JSON', Icon: JsonIcon },
  { key: 'query_data', label: 'Query Data', Icon: QueryDataIcon },
  { key: 'no_events', label: 'No Events', Icon: NoEventsIcon },
];
