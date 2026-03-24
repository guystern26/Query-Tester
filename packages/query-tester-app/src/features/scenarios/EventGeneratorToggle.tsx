import React, { useState } from 'react';
import type { EntityId, TestInput } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { GeneratorPanel } from '../eventGenerator/GeneratorPanel';

export interface EventGeneratorToggleProps {
  testId: EntityId;
  scenarioId: EntityId;
  input: TestInput;
  generatorAvailable: boolean;
  generatorFieldNames?: string[];
}

export function EventGeneratorToggle({ testId, scenarioId, input, generatorAvailable, generatorFieldNames }: EventGeneratorToggleProps) {
  const state = useTestStore();
  const [genOpen, setGenOpen] = useState(input.generatorConfig.enabled);

  return (
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>Event Generator</span>

        {input.generatorConfig.enabled && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 shrink-0 ${genOpen ? 'rotate-90' : ''}`}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}

        <div className="flex-1" />

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
  );
}
