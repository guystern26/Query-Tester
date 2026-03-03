import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { TopBar } from '../../components/test-navigation/TopBar';
import { TestTypeSelector } from '../../features/scenarios/TestTypeSelector';
import { QuerySection } from '../../features/query/QuerySection';
import { ScenarioPanel } from '../../features/scenarios/ScenarioPanel';
import { ValidationSection } from '../../features/validation/ValidationSection';
import { ResultsBar } from '../../features/results/ResultsBar';

/* ── helpers ─────────────────────────────────────────────────── */

function StepCircle({ step, done }: { step: number; done?: boolean }) {
  const cls = done
    ? 'border-green-500 bg-green-900/30 text-green-400'
    : 'border-cyan-500 bg-cyan-900/30 text-cyan-400';
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] shrink-0 ${cls}`}>
      {done ? '✓' : step}
    </span>
  );
}

function PanelHeader({ step, label, done }: { step: number; label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <StepCircle step={step} done={done} />
      <span className="text-sm font-semibold text-slate-200">{label}</span>
    </div>
  );
}

/* ── page component ─────────────────────────────────────────── */

export function StartPage() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const rowRef = useRef<HTMLDivElement>(null);
  const [barExpanded, setBarExpanded] = useState(false);

  const app = activeTest?.app ?? '';
  const testType = activeTest?.testType ?? 'standard';
  const hasApp = app.trim() !== '';
  const hasQuery = (activeTest?.query.spl ?? '').trim() !== '';
  const showData = hasApp && hasQuery && testType === 'standard';
  const hasScenariosWithInputs =
    (activeTest?.scenarios?.length ?? 0) > 0 &&
    activeTest?.scenarios?.some((s) => (s.inputs?.length ?? 0) > 0);
  const showValidation = hasApp && hasQuery && (testType === 'query_only' || !!hasScenariosWithInputs);

  const handleAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTest) state.updateApp(activeTest.id, e.target.value);
  };

  const panelCount = (hasApp ? 1 : 0) + (showData ? 1 : 0) + (showValidation ? 1 : 0);
  const prevCount = useRef(panelCount);

  const scrollToEnd = useCallback(() => {
    const el = rowRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (panelCount > prevCount.current) scrollToEnd();
    prevCount.current = panelCount;
  }, [panelCount, scrollToEnd]);

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100"
      style={{ paddingBottom: barExpanded ? '45vh' : '48px' }}
    >
      <TopBar />

      {hasApp ? (
        <div className="shrink-0 px-5 pt-4 animate-fadeIn">
          <div className="flex items-center gap-5 px-5 py-2 bg-slate-900 rounded-xl border border-slate-800 shadow-md">
            <PanelHeader step={1} label="Setup" done={true} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">App</span>
              <input
                type="text"
                value={app}
                onChange={handleAppChange}
                placeholder="e.g. search"
                className="w-44 px-2.5 py-1 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
              />
            </div>
            <TestTypeSelector compact />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 rounded-2xl border border-slate-800 shadow-lg p-8 flex flex-col gap-6">
            <PanelHeader step={1} label="Setup" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Splunk App</span>
              <input
                type="text"
                value={app}
                onChange={handleAppChange}
                placeholder="e.g. search"
                autoFocus
                className="w-full px-3.5 py-2.5 text-base bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
              />
            </div>
            <TestTypeSelector />
          </div>
        </div>
      )}

      {hasApp && (
        <div ref={rowRef} className="flex gap-5 p-5 overflow-x-auto flex-1 items-stretch animate-fadeIn">
          <div className="min-w-[300px] bg-slate-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-slideIn" style={{ flex: '32 1 0%' }}>
            <PanelHeader step={2} label="Query" done={hasQuery} />
            <QuerySection />
          </div>

          {showData && (
            <div className="min-w-[360px] bg-slate-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-slideIn" style={{ flex: '34 1 0%' }}>
              <PanelHeader step={3} label="Data" done={!!hasScenariosWithInputs} />
              <ScenarioPanel />
            </div>
          )}

          {showValidation && (
            <div className="min-w-[280px] bg-slate-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-slideIn" style={{ flex: '31 1 0%' }}>
              <PanelHeader step={testType === 'query_only' ? 3 : 4} label="Validation" />
              <ValidationSection />
            </div>
          )}
        </div>
      )}

      <ResultsBar expanded={barExpanded} setExpanded={setBarExpanded} />
    </div>
  );
}
