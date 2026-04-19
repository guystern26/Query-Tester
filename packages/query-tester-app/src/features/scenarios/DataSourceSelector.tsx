/**
 * DataSourceSelector — hybrid text input + dropdown of AI-extracted data sources.
 * Replaces the plain row identifier text input on InputCard.
 */
import React, { useState, useRef, useEffect } from 'react';
import type { EntityId, ExtractedDataSource, Scenario } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

export interface DataSourceSelectorProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  value: string;
  matchCount: number;
  hasIdentifiers: boolean;
}

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function DataSourceSelector({ testId, scenarioId, inputId, value, matchCount, hasIdentifiers }: DataSourceSelectorProps): React.ReactElement {
  const test = useTestStore(selectActiveTest);
  const selectDataSource = useTestStore((s) => s.selectDataSource);
  const fetchSampleValues = useTestStore((s) => s.fetchSampleValues);
  const updateRowIdentifier = useTestStore((s) => s.updateRowIdentifier);
  const [open, setOpen] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const sources = test?.fieldExtraction?.sources || [];
  const hasSources = sources.length > 0;

  // Find which row identifiers are already used by other inputs in this scenario
  const usedIdentifiers = new Set<string>();
  if (test) {
    const scenario = test.scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      for (const inp of scenario.inputs) {
        if (inp.id !== inputId && inp.rowIdentifier.trim()) {
          usedIdentifiers.add(inp.rowIdentifier.trim());
        }
      }
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (source: ExtractedDataSource) => {
    selectDataSource(testId, scenarioId, inputId, source);
    setOpen(false);
    const app = test?.app ?? '';
    const tr = test?.query?.timeRange;
    if (app && source.fields.length > 0) {
      setLoadingValues(true);
      fetchSampleValues(testId, scenarioId, inputId, source.rowIdentifier, source.fields, app, tr)
        .finally(() => setLoadingValues(false));
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full mb-4">
      <div className="mb-1.5">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Inject Into</span>
      </div>
      <div className="flex">
        <input
          type="text"
          value={value}
          onChange={(e) => updateRowIdentifier(testId, scenarioId, inputId, e.target.value)}
          placeholder="e.g., index=main sourcetype=access_combined"
          className={`flex-1 min-w-0 px-3 py-2 text-sm bg-navy-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200 ${
            hasSources ? 'rounded-l-lg border-r-0' : 'rounded-lg'
          }`}
        />
        {hasSources && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`px-2 bg-navy-950 border rounded-r-lg cursor-pointer transition-colors duration-200 flex items-center ${
              open
                ? 'border-blue-400 text-slate-200'
                : 'border-blue-500/50 text-blue-400 hover:text-blue-300 hover:border-blue-400'
            }`}
            title="Select from extracted sources"
          >
            <ChevronDown />
          </button>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
        This text will be <strong className="text-slate-400">found and replaced</strong> in
        your query with a temp index containing your test events.
        Enter only the data source filter (e.g. <code className="text-slate-400">index=main sourcetype=...</code>),
        not the pipe or brackets before it.
      </p>
      {hasIdentifiers && value.trim() && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${matchCount > 0 ? 'bg-amber-500' : 'bg-slate-600'}`} />
          <span className={`text-[11px] ${matchCount > 0 ? 'text-amber-500/80' : 'text-slate-600'}`}>
            {matchCount === 0
              ? 'No matches in query'
              : `${matchCount} match${matchCount !== 1 ? 'es' : ''} highlighted in query`}
          </span>
        </div>
      )}
      {loadingValues && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-blue-300">
          <span className="w-2.5 h-2.5 border-[1.5px] border-blue-300 border-t-transparent rounded-full animate-spin" />
          Loading default values from Splunk...
        </div>
      )}

      {open && hasSources && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-navy-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {sources.map((src, i) => {
            const isUsed = usedIdentifiers.has(src.rowIdentifier.trim());
            return (
              <button
                key={i}
                type="button"
                disabled={isUsed}
                onClick={() => handleSelect(src)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isUsed
                    ? 'text-slate-600 cursor-not-allowed bg-navy-950/50'
                    : 'text-slate-200 hover:bg-navy-800 cursor-pointer'
                }`}
              >
                <div className="font-medium truncate">{src.rowIdentifier}</div>
                {src.fields.length > 0 && (
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {src.fields.join(', ')}
                  </div>
                )}
                {isUsed && <span className="text-[10px] text-slate-600 italic">already used</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
