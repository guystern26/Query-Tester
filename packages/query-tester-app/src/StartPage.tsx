import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, inputHasData } from 'core/store/selectors';
import type { TestResponse, ScenarioResult } from 'core/types';
import { scheduledTestsApi } from './api/scheduledTestsApi';
import { EMPTY_SPL_ANALYSIS } from './features/results/resultHelpers';
import { TopBar } from './components/test-navigation/TopBar';
import { AppSelector } from './components/AppSelector';
import { TestTypeSelector } from './features/scenarios/TestTypeSelector';
import { QuerySection } from './features/query/QuerySection';
import { ScenarioPanel } from './features/scenarios/ScenarioPanel';
import { ValidationSection } from './features/validation/ValidationSection';
import { ResultsBar } from './features/results/ResultsBar';
import { usePipelineState } from './features/layout/usePipelineState';
import { StepPipeline } from './features/layout/StepPipeline';
import { PipelineConnector } from './features/layout/PipelineConnector';

/* ── page component ─────────────────────────────────────────── */

export interface StartPageProps {
  onNavigateLibrary?: () => void;
  loadTestId?: string;
}

export function StartPage({ onNavigateLibrary, loadTestId }: StartPageProps = {}) {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  // After loading a test, try to show its last scheduled run result
  const loadLastRun = useCallback((testId: string) => {
    const tryLoad = (scheds: typeof state.scheduledTests) => {
      const sched = scheds.find((s) => s.testId === testId);
      if (!sched || !sched.lastRunAt) return;

      scheduledTestsApi.getRunHistory(sched.id).then((records) => {
        if (!records || records.length === 0) return;
        const last = records[0];
        const scenarios = (last.scenarioResults || []) as Array<{
          scenarioName?: string; passed?: boolean; message?: string;
        }>;

        const scenarioResults: ScenarioResult[] = scenarios.map((sr) => {
          const msg = sr.message || '';
          // Split combined messages (joined by "; ") into individual validations
          const parts = msg ? msg.split('; ').filter(Boolean) : [];
          const validations = parts.map((p) => ({
            field: '',
            condition: '',
            expected: '',
            actual: '',
            passed: !!sr.passed,
            message: p,
          }));
          return {
            scenarioName: sr.scenarioName || '',
            passed: !!sr.passed,
            executionTimeMs: 0,
            resultCount: 0,
            injectedSpl: '',
            validations,
            resultRows: [],
            error: null,
          };
        });

        const passed = scenarioResults.filter((s) => s.passed).length;
        const total = scenarioResults.length;
        const statusMap: Record<string, TestResponse['status']> = {
          pass: 'pass', fail: 'fail', partial: 'partial', error: 'error',
        };

        const response: TestResponse = {
          status: statusMap[last.status] || 'error',
          message: 'Last run ' + new Date(last.ranAt).toLocaleString(),
          testName: sched.testName,
          testType: 'standard',
          timestamp: last.ranAt,
          totalScenarios: total,
          passedScenarios: passed,
          warnings: [],
          splAnalysis: EMPTY_SPL_ANALYSIS,
          scenarioResults,
        };
        state.setTestResponse(response);
      }).catch(() => { /* ignore */ });
    };

    const scheds = state.scheduledTests;
    if (scheds.length > 0) {
      tryLoad(scheds);
      return;
    }
    // Cold start — fetch scheduled tests first
    scheduledTestsApi.getScheduledTests().then((fetched) => {
      tryLoad(Array.isArray(fetched) ? fetched : []);
    }).catch(() => { /* ignore */ });
  }, [state.scheduledTests]);

  // Load a saved test by ID, or reset to blank when no ID (e.g. "Create New Test")
  useEffect(() => {
    if (!loadTestId) {
      // No test to load — if the builder still holds a saved test, reset to blank
      if (state.savedTestId) {
        state.resetToNewTest();
      }
      return;
    }

    // If store already has the tests (client-side nav from Library), load instantly
    const current = state.savedTests;
    if (current.length > 0) {
      try {
        state.loadTestIntoBuilder(loadTestId);
        loadLastRun(loadTestId);
      } catch { /* */ }
      return;
    }

    // Cold start (direct URL) — fetch from API
    setIsLoadingTest(true);
    state.fetchSavedTests().then(() => {
      try {
        state.loadTestIntoBuilder(loadTestId);
        loadLastRun(loadTestId);
      } catch { /* */ }
      setIsLoadingTest(false);
    }).catch(() => { setIsLoadingTest(false); });
  }, [loadTestId]);
  const rowRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const validationRef = useRef<HTMLDivElement>(null);
  const barExpanded = state.resultsBarExpanded;

  const app = activeTest?.app ?? '';
  const testType = activeTest?.testType ?? 'standard';
  const hasApp = app.trim() !== '';
  const hasQuery = (activeTest?.query?.spl ?? '').trim() !== '';
  const showData = hasApp && hasQuery && testType === 'standard';
  const dataDone = inputHasData(activeTest?.scenarios ?? []);
  const showValidation = hasApp && hasQuery && (testType === 'query_only' || dataDone);

  const pipeline = usePipelineState();

  const handleAppChange = (appValue: string) => {
    if (activeTest) state.updateApp(activeTest.id, appValue);
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
      className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden"
      style={{ paddingBottom: barExpanded ? '45vh' : '48px' }}
    >
      <TopBar onNavigateLibrary={onNavigateLibrary} />

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
                <AppSelector value={app} onChange={handleAppChange} compact />
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
      ) : isLoadingTest ? (
        <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
          <div className="flex flex-col items-center gap-4">
            <svg className="w-8 h-8 text-accent-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
            <span className="text-sm text-slate-400">Loading test...</span>
          </div>
        </div>
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
              <AppSelector value={app} onChange={handleAppChange} autoFocus />
            </div>
            <TestTypeSelector />
          </div>
        </div>
      )}

      {hasApp && (
        <div ref={rowRef} className="flex gap-0 p-5 overflow-x-auto flex-1 items-stretch animate-fadeIn min-h-0">
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
              <PipelineConnector leftComplete={showData ? dataDone : hasQuery} />
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
