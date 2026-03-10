/**
 * AppSelector — dropdown for choosing a Splunk app.
 * Fetches apps directly from the Splunk REST API on mount.
 * Falls back to a text input in Vite dev mode.
 */
import React, { useEffect, useState } from 'react';

export interface AppSelectorProps {
  value: string;
  onChange: (app: string) => void;
  compact?: boolean;
  autoFocus?: boolean;
}

const compactCls = 'w-44 px-2.5 py-1 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200 cursor-pointer';
const fullCls = 'w-full px-3.5 py-2.5 text-base bg-navy-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200 cursor-pointer';

const DEV_MOCK_APPS = [
  'search',
  'query_tester',
  'splunk_httpinput',
  'splunk_instrumentation',
  'SplunkEnterpriseSecuritySuite',
  'Splunk_SA_CIM',
  'Splunk_TA_windows',
];

function isViteDev(): boolean {
  try {
    return import.meta.env?.DEV === true;
  } catch {
    return false;
  }
}

async function fetchApps(): Promise<string[]> {
  if (isViteDev()) return DEV_MOCK_APPS;

  const res = await fetch(
    '/splunkd/__raw/services/apps/local?output_mode=json&count=0',
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const entries = data?.entry;
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e: any) => {
      const c = e.content;
      if (c && c.disabled === true) return false;
      if (c && c.visible === false) return false;
      return typeof e.name === 'string';
    })
    .map((e: any) => e.name as string)
    .sort();
}

export function AppSelector({ value, onChange, compact, autoFocus }: AppSelectorProps) {
  const [apps, setApps] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApps()
      .then((list) => { if (!cancelled) setApps(list); })
      .catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, []);

  const cls = compact ? compactCls : fullCls;

  // Still loading
  if (apps === null && !error) {
    return (
      <select disabled className={cls + ' !text-slate-500'}>
        <option>Loading...</option>
      </select>
    );
  }

  // Error — show manual input
  if (error || (apps !== null && apps.length === 0)) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. search"
        autoFocus={autoFocus}
        className={cls}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      className={cls}
    >
      <option value="" disabled>
        Select an app...
      </option>
      {apps!.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
