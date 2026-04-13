/**
 * TimeRangePicker — wraps @splunk/react-time-range Dropdown with SplunkwebConnector.
 * Falls back to a simple preset select when running outside Splunk Web (Vite dev).
 */
import React, { useState, useEffect } from 'react';
import type { TimeRange } from 'core/types';

/** Presets used in the fallback select (Vite dev only). */
const FALLBACK_PRESETS: TimeRange[] = [
  { earliest: '0', latest: 'now', label: 'All time' },
  { earliest: '-15m', latest: 'now', label: 'Last 15 minutes' },
  { earliest: '-60m', latest: 'now', label: 'Last 60 minutes' },
  { earliest: '-4h@h', latest: 'now', label: 'Last 4 hours' },
  { earliest: '-24h@h', latest: 'now', label: 'Last 24 hours' },
  { earliest: '-7d@d', latest: 'now', label: 'Last 7 days' },
  { earliest: '-30d@d', latest: 'now', label: 'Last 30 days' },
];

export interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (timeRange: TimeRange) => void;
}

/* ---------- Splunk native picker ---------- */

let SplunkDropdown: React.ComponentType<any> | null = null;
let SplunkwebConnector: React.ComponentType<any> | null = null;
let splunkImportFailed = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  SplunkDropdown = require('@splunk/react-time-range/Dropdown').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  SplunkwebConnector = require('@splunk/react-time-range/SplunkwebConnector').default;
} catch {
  splunkImportFailed = true;
}

function isSplunkEnv(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== 'undefined' && !!(window as any).$C;
  } catch {
    return false;
  }
}

function SplunkTimePicker({ value, onChange }: TimeRangePickerProps) {
  if (!SplunkDropdown || !SplunkwebConnector) return null;

  const handleChange = (_e: React.SyntheticEvent, data: { earliest: string; latest: string }) => {
    const label = buildLabel(data.earliest, data.latest);
    onChange({ earliest: data.earliest, latest: data.latest, label });
  };

  return (
    <SplunkwebConnector>
      <SplunkDropdown
        earliest={value.earliest}
        latest={value.latest}
        onChange={handleChange}
      />
    </SplunkwebConnector>
  );
}

/* ---------- Fallback select ---------- */

function FallbackTimePicker({ value, onChange }: TimeRangePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = FALLBACK_PRESETS.find((p) => p.earliest === e.target.value);
    if (preset) onChange(preset);
  };

  return (
    <select
      value={value.earliest}
      onChange={handleChange}
      className="px-2.5 py-1.5 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 cursor-pointer transition-all duration-200"
    >
      {FALLBACK_PRESETS.map((p) => (
        <option key={p.earliest} value={p.earliest}>{p.label}</option>
      ))}
    </select>
  );
}

/* ---------- Label builder ---------- */

const LABEL_MAP: Record<string, string> = {
  '0': 'All time',
  '-15m': 'Last 15 minutes',
  '-60m': 'Last 60 minutes',
  '-4h@h': 'Last 4 hours',
  '-24h@h': 'Last 24 hours',
  '-7d@d': 'Last 7 days',
  '-30d@d': 'Last 30 days',
};

function buildLabel(earliest: string, latest: string): string {
  if (latest === 'now' && LABEL_MAP[earliest]) return LABEL_MAP[earliest];
  if (earliest === '0' && latest === 'now') return 'All time';
  return earliest + ' to ' + latest;
}

/* ---------- Export ---------- */

export function TimeRangePicker(props: TimeRangePickerProps) {
  const useSplunk = !splunkImportFailed && isSplunkEnv();
  return useSplunk ? <SplunkTimePicker {...props} /> : <FallbackTimePicker {...props} />;
}
