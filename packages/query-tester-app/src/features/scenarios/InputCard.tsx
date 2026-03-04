import React, { useMemo, useState } from 'react';
import type { TestInput, InputMode, EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { Card } from '../../common';
import { FieldValueEditor } from '../../components/inputs/FieldValueEditor';
import { JsonInputView } from '../../components/inputs/JsonInputView';
import { GeneratorPanel } from '../eventGenerator/GeneratorPanel';

export interface InputCardProps {
  testId: EntityId;
  scenarioId: EntityId;
  input: TestInput;
  index?: number;
  isOpen?: boolean;
  onToggle?: () => void;
  accentBorder?: string;
}

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

const JsonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H6a2 2 0 0 0-2 2v2m0 6v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m0 6v2a2 2 0 0 1-2 2h-2" />
  </svg>
);

const NoEventsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><line x1="5" y1="5" x2="19" y2="19" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-90' : ''}`}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MODE_LABELS: Record<InputMode, string> = { fields: 'Fields', json: 'JSON', no_events: 'No Events' };

const modes: { key: InputMode; label: string; Icon: React.FC }[] = [
  { key: 'fields', label: 'Fields', Icon: GridIcon },
  { key: 'json', label: 'JSON', Icon: JsonIcon },
  { key: 'no_events', label: 'No Events', Icon: NoEventsIcon },
];

export function InputCard({ testId, scenarioId, input, index, isOpen = true, onToggle, accentBorder = '' }: InputCardProps) {
  const state = useTestStore();
  const [genOpen, setGenOpen] = useState(false);
  const num = index ?? 1;

  const setMode = (mode: InputMode) => {
    state.setInputMode(testId, scenarioId, input.id, mode);
    setGenOpen(false);
  };

  const fieldCount = input.events.length === 0 ? 0 : Math.max(0, ...input.events.map((e) => e.fieldValues.length));
  const hasNamedFields = input.events.length > 0 && input.events[0].fieldValues.some((fv) => fv.field.trim() !== '');

  // Extract field names + validity from JSON (single parse)
  const { jsonFieldNames, jsonIsValid } = useMemo(() => {
    if (!input.jsonContent?.trim()) return { jsonFieldNames: [] as string[], jsonIsValid: false };
    try {
      const parsed = JSON.parse(input.jsonContent);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const keys = new Set<string>();
      for (const item of items) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.keys(item).forEach((k) => keys.add(k));
        }
      }
      return { jsonFieldNames: Array.from(keys), jsonIsValid: true };
    } catch { return { jsonFieldNames: [] as string[], jsonIsValid: false }; }
  }, [input.jsonContent]);

  // Generator is available when: fields mode + has named fields, OR json mode + valid JSON
  const generatorAvailable = input.inputMode === 'fields' ? hasNamedFields
    : input.inputMode === 'json' ? jsonIsValid
    : false;

  // Field names for the generator depend on current mode
  const generatorFieldNames = input.inputMode === 'json' ? jsonFieldNames : undefined;

  const summary = input.rowIdentifier.trim()
    ? input.rowIdentifier.trim()
    : `${input.events.length} event${input.events.length !== 1 ? 's' : ''}, ${fieldCount} field${fieldCount !== 1 ? 's' : ''}`;

  // Collapsed state — compact clickable bar
  if (!isOpen) {
    return (
      <div
        className={`flex items-center gap-3 px-4 py-2.5 bg-navy-800 rounded-lg border border-slate-700 border-l-2 ${accentBorder || 'border-l-slate-700'} cursor-pointer hover:border-slate-600 transition-all duration-200 select-none`}
        onClick={onToggle}
      >
        <ChevronIcon open={false} />
        <span className="font-semibold text-sm text-slate-200">Input {num}</span>
        <span className="text-xs text-slate-500 truncate flex-1">{summary}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-navy-900 px-2 py-0.5 rounded-full shrink-0">
          {MODE_LABELS[input.inputMode]}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); state.deleteInput(testId, scenarioId, input.id); }}
          className="w-6 h-6 rounded-md text-slate-500 flex items-center justify-center hover:bg-red-900/30 hover:text-red-400 transition-all duration-200 cursor-pointer"
          aria-label="Delete input"
        >
          ×
        </button>
      </div>
    );
  }

  // Expanded state — full card
  return (
    <Card className={accentBorder ? `border-l-2 ${accentBorder}` : ''}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggle}>
          <ChevronIcon open={true} />
          <span className="font-semibold text-[15px] text-slate-100">Input {num}</span>
        </div>
        <button
          type="button"
          onClick={() => state.deleteInput(testId, scenarioId, input.id)}
          className="w-7 h-7 rounded-md border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition-all duration-200 cursor-pointer"
          aria-label="Delete input"
        >
          ×
        </button>
      </div>

      <input
        type="text"
        value={input.rowIdentifier}
        onChange={(e) => state.updateRowIdentifier(testId, scenarioId, input.id, e.target.value)}
        placeholder="e.g., index=main sourcetype=access_combined"
        className="w-full mb-4 px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200"
      />

      <div className="flex bg-navy-950/80 rounded-xl p-1 border border-slate-700/60 w-fit mb-4 gap-0.5">
        {modes.map(({ key, label, Icon }) => {
          const active = input.inputMode === key;
          return (
            <button
              key={key}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-accent-900 text-accent-300 border border-accent-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
              }`}
              onClick={() => setMode(key)}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>

      <div>
        {input.inputMode === 'fields' && (
          <FieldValueEditor testId={testId} scenarioId={scenarioId} inputId={input.id} events={input.events} />
        )}
        {input.inputMode === 'json' && (
          <JsonInputView testId={testId} scenarioId={scenarioId} inputId={input.id} />
        )}
        {input.inputMode === 'no_events' && (
          <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-navy-800/30 border border-slate-700/40">
            <NoEventsIcon />
            <p className="m-0 text-[13px] text-slate-400">No event data. This input will contribute zero events to the test.</p>
          </div>
        )}

        {/* Event Generator — available for fields and json modes */}
        {input.inputMode !== 'no_events' && (
          <>
            <div
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 mt-4 rounded-lg text-[13px] font-medium transition-all duration-200 border select-none ${
                !generatorAvailable
                  ? 'opacity-40 cursor-not-allowed bg-transparent border-slate-700/60 text-slate-500'
                  : input.generatorConfig.enabled
                    ? 'bg-navy-800/80 border-slate-600 text-slate-200 cursor-pointer'
                    : 'bg-transparent border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 cursor-pointer animate-generatorGlow'
              }`}
              onClick={() => {
                if (!generatorAvailable) return;
                if (!input.generatorConfig.enabled) {
                  state.setGeneratorEnabled(testId, scenarioId, input.id, true);
                  setGenOpen(true);
                } else {
                  setGenOpen(!genOpen);
                }
              }}
            >
              {/* Zap icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Event Generator</span>

              {/* Chevron — only when enabled */}
              {input.generatorConfig.enabled && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 shrink-0 ${genOpen ? 'rotate-90' : ''}`}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}

              <div className="flex-1" />

              {/* Event count — presets + free input when enabled */}
              {input.generatorConfig.enabled && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {[100, 1000, 5000, 10000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all duration-150 cursor-pointer ${
                        input.generatorConfig.eventCount === n
                          ? 'bg-green-600 text-white'
                          : 'bg-navy-950 text-slate-400 border border-slate-700 hover:text-slate-200 hover:border-slate-500'
                      }`}
                      onClick={() => state.updateGeneratorEventCount(testId, scenarioId, input.id, n)}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={input.generatorConfig.eventCount || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw.trim() === '') { state.updateGeneratorEventCount(testId, scenarioId, input.id, 0); return; }
                      const n = Number(raw);
                      if (!Number.isNaN(n) && n >= 0) state.updateGeneratorEventCount(testId, scenarioId, input.id, Math.min(n, 10000));
                    }}
                    placeholder="# events"
                    className="w-[80px] px-2 py-0.5 text-[11px] bg-navy-950 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 transition text-center"
                  />
                </div>
              )}

              {/* Toggle switch */}
              <button
                type="button"
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${
                  input.generatorConfig.enabled ? 'bg-green-600' : 'bg-slate-700'
                } cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!generatorAvailable) return;
                  const next = !input.generatorConfig.enabled;
                  state.setGeneratorEnabled(testId, scenarioId, input.id, next);
                  if (!next) setGenOpen(false);
                  else setGenOpen(true);
                }}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${input.generatorConfig.enabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${genOpen && input.generatorConfig.enabled ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className={`mt-1 rounded-lg transition-colors duration-200 ${genOpen && input.generatorConfig.enabled ? 'bg-navy-800/30 border border-slate-700/40 p-3' : ''}`}>
                <GeneratorPanel testId={testId} scenarioId={scenarioId} inputId={input.id} fieldNames={generatorFieldNames} />
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
