import React, { useState } from 'react';
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

export function InputCard({ testId, scenarioId, input, index, isOpen = true, onToggle }: InputCardProps) {
  const state = useTestStore();
  const [genOpen, setGenOpen] = useState(false);
  const num = index ?? 1;

  const setMode = (mode: InputMode) => {
    state.setInputMode(testId, scenarioId, input.id, mode);
  };

  const fieldCount = input.events.length === 0 ? 0 : Math.max(0, ...input.events.map((e) => e.fieldValues.length));
  const hasNamedFields = input.events.length > 0 && input.events[0].fieldValues.some((fv) => fv.field.trim() !== '');
  const summary = input.rowIdentifier.trim()
    ? input.rowIdentifier.trim()
    : `${input.events.length} event${input.events.length !== 1 ? 's' : ''}, ${fieldCount} field${fieldCount !== 1 ? 's' : ''}`;

  // Collapsed state — compact clickable bar
  if (!isOpen) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition select-none"
        onClick={onToggle}
      >
        <ChevronIcon open={false} />
        <span className="font-semibold text-sm text-slate-200">Input {num}</span>
        <span className="text-xs text-slate-500 truncate flex-1">{summary}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full shrink-0">
          {MODE_LABELS[input.inputMode]}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); state.deleteInput(testId, scenarioId, input.id); }}
          className="w-6 h-6 rounded-md text-slate-500 flex items-center justify-center hover:bg-red-900/30 hover:text-red-400 transition cursor-pointer"
          aria-label="Delete input"
        >
          ×
        </button>
      </div>
    );
  }

  // Expanded state — full card
  return (
    <Card>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggle}>
          <ChevronIcon open={true} />
          <span className="font-semibold text-[15px] text-slate-100">Input {num}</span>
        </div>
        <button
          type="button"
          onClick={() => state.deleteInput(testId, scenarioId, input.id)}
          className="w-7 h-7 rounded-md border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition cursor-pointer"
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
        className="w-full mb-4 px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
      />

      <div className="flex bg-slate-950/80 rounded-xl p-1 border border-slate-700/60 w-fit mb-4 gap-0.5">
        {modes.map(({ key, label, Icon }) => {
          const active = input.inputMode === key;
          return (
            <button
              key={key}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
          <>
            <FieldValueEditor testId={testId} scenarioId={scenarioId} inputId={input.id} events={input.events} />
            <button
              className={`flex items-center gap-2 w-full px-3 py-2.5 mt-4 rounded-lg text-[13px] font-medium transition-all duration-200 border ${
                !hasNamedFields
                  ? 'opacity-40 cursor-not-allowed bg-transparent border-slate-700/60 text-slate-500'
                  : genOpen
                    ? 'bg-slate-800/80 border-slate-600 text-slate-200 cursor-pointer'
                    : 'bg-transparent border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 cursor-pointer'
              }`}
              onClick={() => hasNamedFields && setGenOpen(!genOpen)}
              disabled={!hasNamedFields}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${genOpen ? 'rotate-90' : ''}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>Event Generator</span>
              {input.generatorConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50 shrink-0" />
              )}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${genOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className={`mt-1 rounded-lg transition-colors duration-200 ${genOpen ? 'bg-slate-800/30 border border-slate-700/40 p-3' : ''}`}>
                <GeneratorPanel testId={testId} scenarioId={scenarioId} inputId={input.id} />
              </div>
            </div>
          </>
        )}
        {input.inputMode === 'json' && (
          <JsonInputView testId={testId} scenarioId={scenarioId} inputId={input.id} />
        )}
        {input.inputMode === 'no_events' && (
          <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
            <NoEventsIcon />
            <p className="m-0 text-[13px] text-slate-400">No event data. This input will contribute zero events to the test.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
