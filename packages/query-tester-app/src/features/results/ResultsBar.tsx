import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectTestResponse } from 'core/store/selectors';
import { validateBeforeRun } from '../../utils/preflight';
import { ScenarioResultCard } from './ScenarioResultCard';
import { EMPTY_SPL_ANALYSIS } from './resultHelpers';

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${up ? '' : 'rotate-180'}`}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ResultsBar() {
  const store = useTestStore();
  const test = selectActiveTest(store);
  const response = selectTestResponse(store);
  const { isRunning, resultsBarExpanded: expanded, toggleResultsBar } = store;

  /* preflight errors stored in testResponse.errors with PREFLIGHT_ codes */
  const preflightErrors = (response?.errors ?? []).filter((e) => e.code.startsWith('PREFLIGHT_'));
  const isPreflightFailure = preflightErrors.length > 0;
  const displayErrors = isPreflightFailure ? [] : (response?.errors ?? []);
  const warnings = response?.warnings ?? [];
  const splAnalysis = response?.splAnalysis ?? EMPTY_SPL_ANALYSIS;

  /* status text */
  let status: React.ReactNode;
  if (isRunning) {
    status = (
      <>
        <span className="w-3.5 h-3.5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-accent-400">Running query...</span>
      </>
    );
  } else if (isPreflightFailure) {
    status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{preflightErrors.length} pre-flight error(s)</span></>;
  } else if (response) {
    const sr = response.scenarioResults;
    const t = sr.length;
    const p = sr.filter((s) => s.passed).length;
    const isCancelled = response.status === 'error' && response.message === 'Test cancelled by user.';
    const isLastRun = response.message?.startsWith('Last run');
    if (isCancelled) {
      status = <><span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" /><span className="text-slate-400">Cancelled</span></>;
    } else if (response.status === 'error' && t === 0) {
      status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{response.message}</span></>;
    } else if (p < t) {
      status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{isLastRun ? response.message + ' \u2014 ' : ''}{t - p}/{t} scenarios failed</span></>;
    } else {
      status = <><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /><span className="text-green-400">{isLastRun ? response.message + ' \u2014 ' : ''}{p}/{t} scenarios passed</span></>;
    }
  } else {
    status = <span className="text-slate-400">Ready to run</span>;
  }

  /* run handler */
  const handleRun = () => {
    if (!test) return;
    if (isRunning) { store.cancelTest(); return; }
    const errs = validateBeforeRun(test);
    if (errs.length > 0) {
      store.setTestResponse({
        status: 'error',
        message: errs.length + ' validation error(s) found',
        testName: test.name,
        testType: test.testType,
        timestamp: new Date().toISOString(),
        totalScenarios: 0,
        passedScenarios: 0,
        warnings: [],
        splAnalysis: EMPTY_SPL_ANALYSIS,
        scenarioResults: [],
        errors: errs.map((msg, i) => ({
          code: 'PREFLIGHT_' + i,
          message: msg,
          severity: 'error',
        })),
      });
      return;
    }
    void store.runTest();
  };

  /* button */
  let btnLabel: string;
  let btnCls: string;
  if (isRunning) { btnLabel = 'Cancel'; btnCls = 'bg-red-500 hover:bg-red-600'; }
  else if (response) { btnLabel = 'Rerun'; btnCls = 'bg-blue-500 hover:bg-blue-600'; }
  else { btnLabel = 'Run Test'; btnCls = 'bg-green-500 hover:bg-green-600'; }

  const sr = response?.scenarioResults ?? [];
  const totalS = sr.length;
  const passedS = sr.filter((s) => s.passed).length;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col overflow-hidden transition-all duration-300 ease-out"
      style={{ height: expanded ? '45vh' : '48px' }}
    >
      {/* Summary row */}
      <div
        className="h-12 shrink-0 flex items-center justify-between px-5 bg-navy-900 border-t-2 border-slate-700 cursor-pointer select-none"
        onClick={toggleResultsBar}
      >
        <div className="flex items-center gap-2 text-[13px]">{status}</div>
        <div className="flex items-center gap-2">
          <Chevron up={!expanded} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleRun(); }}
            className={`px-4 py-1.5 rounded-md text-[13px] font-semibold text-white cursor-pointer transition-colors duration-200 border-none ${btnCls}`}
          >
            {btnLabel}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <div
        style={{ overflowY: 'auto' }}
        className={`flex-1 min-h-0 bg-navy-950 p-4 transition-opacity duration-200 ${expanded ? 'opacity-100 delay-150' : 'opacity-0'}`}
      >
        <div className="flex flex-col gap-3">
        {/* Preflight errors */}
        {isPreflightFailure && (
          <>
            <div className="font-semibold text-red-500 text-[13px]">Pre-flight errors</div>
            {preflightErrors.map((e, i) => (
              <div key={i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">{e.message}</div>
            ))}
          </>
        )}

        {/* splAnalysis: unauthorized commands = error banner */}
        {splAnalysis.unauthorizedCommands.length > 0 && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-300">
            <strong>Unauthorized commands detected:</strong>{' '}
            {splAnalysis.unauthorizedCommands.join(', ')}
          </div>
        )}

        {/* splAnalysis: unusual commands = warning banner */}
        {splAnalysis.unusualCommands.length > 0 && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-[13px] text-amber-300">
            <strong>Unusual commands:</strong>{' '}
            {splAnalysis.unusualCommands.join(', ')}
          </div>
        )}

        {/* splAnalysis: uniq limitations */}
        {splAnalysis.uniqLimitations && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-[13px] text-amber-300">
            <strong>Note:</strong> {splAnalysis.uniqLimitations}
          </div>
        )}

        {/* Frontend errors */}
        {displayErrors.map((e, i) => (
          <div key={'e' + i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">
            {e.message}
            {e.tip && <div className="text-slate-400 mt-1 text-xs">{e.tip}</div>}
          </div>
        ))}

        {/* Backend warnings */}
        {warnings.map((w, i) => (
          <div key={'w' + i} className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-navy-800 text-[13px] text-slate-200">{w.message}</div>
        ))}

        {/* Scenario result cards */}
        {sr.map((s, i) => <ScenarioResultCard key={i} result={s} />)}

        {totalS > 0 && (
          <div className="py-2 border-t border-slate-700 text-[13px] text-slate-400">
            Total: {passedS} passed, {totalS - passedS} failed{displayErrors.length > 0 ? ', ' + displayErrors.length + ' errors' : ''}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
