import React, { useRef, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { TopBar } from '../../components/test-navigation/TopBar';
import { TestTypeSelector } from '../../features/scenarios/TestTypeSelector';
import { QuerySection } from '../../features/query/QuerySection';
import { ScenarioPanel } from '../../features/scenarios/ScenarioPanel';
import { ValidationSection } from '../../features/validation/ValidationSection';
import { ResultsBar } from '../../features/results/ResultsBar';
import { usePipelineState } from '../../features/layout/usePipelineState';
import { StepPipeline } from '../../features/layout/StepPipeline';
import { PipelineConnector } from '../../features/layout/PipelineConnector';

/* ── page component ─────────────────────────────────────────── */

export function StartPage() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const rowRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const validationRef = useRef<HTMLDivElement>(null);
  const barExpanded = state.resultsBarExpanded;

  const app = activeTest?.app ?? '';
  const testType = activeTest?.testType ?? 'standard';
  const hasApp = app.trim() !== '';
  const hasQuery = (activeTest?.query.spl ?? '').trim() !== '';
  const showData = hasApp && hasQuery && testType === 'standard';
  const hasScenariosWithInputs =
    (activeTest?.scenarios?.length ?? 0) > 0 &&
    activeTest?.scenarios?.some((s) => (s.inputs?.length ?? 0) > 0);
  const showValidation = hasApp && hasQuery && (testType === 'query_only' || !!hasScenariosWithInputs);

  const pipeline = usePipelineState();

  const handleAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTest) state.updateApp(activeTest.id, e.target.value);
  };

  const handleStepClick = useCallback((stepId: string) => {
    const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
      query: queryRef,
      data: dataRef,
      validation: validationRef,
    };
    const ref = refMap[stepId];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  }, []);

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
      className="min-h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100"
      style={{ paddingBottom: barExpanded ? '45vh' : '48px' }}
    >
      <TopBar />

      {hasApp ? (
        <>
          <div className="shrink-0 px-5 pt-4 animate-fadeIn">
            <div className="flex items-center gap-5 px-5 py-2 bg-navy-900 rounded-xl border border-slate-800 shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] shrink-0 border-green-500 bg-green-900/30 text-green-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm font-semibold text-slate-200">Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">App</span>
                <input
                  type="text"
                  value={app}
                  onChange={handleAppChange}
                  placeholder="e.g. search"
                  className="w-44 px-2.5 py-1 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200"
                />
              </div>
              <TestTypeSelector compact />
            </div>
          </div>

          <StepPipeline
            steps={pipeline.steps}
            activeIndex={pipeline.activeIndex}
            allComplete={pipeline.allComplete}
            isRunning={pipeline.isRunning}
            onStepClick={handleStepClick}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-navy-900 rounded-2xl border border-slate-800 shadow-lg p-8 flex flex-col gap-6">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] shrink-0 border-accent-600 bg-accent-900 text-accent-400">
                1
              </span>
              <span className="text-sm font-semibold text-slate-200">Setup</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Splunk App</span>
              <input
                type="text"
                value={app}
                onChange={handleAppChange}
                placeholder="e.g. search"
                autoFocus
                className="w-full px-3.5 py-2.5 text-base bg-navy-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200"
              />
            </div>
            <TestTypeSelector />
          </div>
        </div>
      )}

      {hasApp && (
        <div ref={rowRef} className="flex gap-0 p-5 overflow-x-auto flex-1 items-stretch animate-fadeIn">
          <div
            ref={queryRef}
            className="min-w-[300px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-0"
            style={{ flex: '32 1 0%' }}
          >
            <span className="text-sm font-semibold text-slate-200">Query</span>
            <QuerySection />
          </div>

          {showData && (
            <>
              <PipelineConnector leftComplete={hasQuery} />
              <div
                ref={dataRef}
                className="min-w-[360px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-1"
                style={{ flex: '34 1 0%' }}
              >
                <span className="text-sm font-semibold text-slate-200">Data</span>
                <ScenarioPanel />
              </div>
            </>
          )}

          {showValidation && (
            <>
              <PipelineConnector leftComplete={showData ? !!hasScenariosWithInputs : hasQuery} />
              <div
                ref={validationRef}
                className="min-w-[280px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-2"
                style={{ flex: '31 1 0%' }}
              >
                <span className="text-sm font-semibold text-slate-200">Validation</span>
                <ValidationSection />
              </div>
            </>
          )}
        </div>
      )}

      <ResultsBar />
    </div>
  );
}
