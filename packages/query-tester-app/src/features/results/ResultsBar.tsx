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
      className={'transition-transform duration-200 ' + (up ? '' : 'rotate-180')}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ResultsBar() {
  var test = useTestStore(selectActiveTest);
  var response = useTestStore(selectTestResponse);
  var isRunning = useTestStore(function (s) { return s.isRunning; });
  var expanded = useTestStore(function (s) { return s.resultsBarExpanded; });
  var commandPolicy = useTestStore(function (s) { return s.commandPolicy; });
  var toggleResultsBar = useTestStore(function (s) { return s.toggleResultsBar; });
  var cancelTest = useTestStore(function (s) { return s.cancelTest; });
  var setTestResponse = useTestStore(function (s) { return s.setTestResponse; });
  var runTest = useTestStore(function (s) { return s.runTest; });
  var activeStep = useTestStore(function (s) { return s.activeStep; });

  var testType = (test && test.testType) || 'standard';
  var totalSteps = testType === 'query_only' ? 2 : 3;
  var isOnLastStep = activeStep === totalSteps - 1;
  var hasValidation = test
      ? ((test.validation && test.validation.fieldGroups && test.validation.fieldGroups.length > 0)
          || (test.validation && test.validation.resultCount && test.validation.resultCount.enabled))
      : false;
  var canRun = isOnLastStep || hasValidation || isRunning;

  var preflightErrors = ((response && response.errors) || []).filter(function (e) { return e.code.indexOf('PREFLIGHT_') === 0; });
  var isPreflightFailure = preflightErrors.length > 0;
  var displayErrors = isPreflightFailure ? [] : ((response && response.errors) || []);
  var warnings = (response && response.warnings) || [];
  var splAnalysis = (response && response.splAnalysis) || EMPTY_SPL_ANALYSIS;

  var status: React.ReactNode;
  if (isRunning) {
    status = (
      <React.Fragment>
        <span className="w-3.5 h-3.5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-blue-300">Running query...</span>
      </React.Fragment>
    );
  } else if (isPreflightFailure) {
    status = <React.Fragment><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{preflightErrors.length} pre-flight error(s)</span></React.Fragment>;
  } else if (response) {
    var sr2 = response.scenarioResults;
    var t = sr2.length;
    var p = sr2.filter(function (s) { return s.passed; }).length;
    var isCancelled = response.status === 'error' && response.message === 'Test cancelled by user.';
    var isLastRun = response.message ? response.message.indexOf('Last run') === 0 : false;
    if (isCancelled) {
      status = <React.Fragment><span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" /><span className="text-slate-400">Cancelled</span></React.Fragment>;
    } else if (response.status === 'error' && t === 0) {
      status = <React.Fragment><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{response.message}</span></React.Fragment>;
    } else if (p < t) {
      status = <React.Fragment><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{isLastRun ? response.message + ' \u2014 ' : ''}{t - p}/{t} scenarios failed</span></React.Fragment>;
    } else {
      status = <React.Fragment><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /><span className="text-green-400">{isLastRun ? response.message + ' \u2014 ' : ''}{p}/{t} scenarios passed</span></React.Fragment>;
    }
  } else {
    status = <span className="text-slate-400">Ready to run</span>;
  }

  var handleRun = function () {
    if (!test) return;
    if (isRunning) { cancelTest(); return; }
    var errs = validateBeforeRun(test, commandPolicy);
    if (errs.length > 0) {
      setTestResponse({
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
        errors: errs.map(function (msg, i) {
          return { code: 'PREFLIGHT_' + i, message: msg, severity: 'error' as 'error' };
        }),
      });
      return;
    }
    void runTest();
  };

  var btnLabel: string;
  var btnCls: string;
  if (isRunning) { btnLabel = 'Cancel'; btnCls = 'bg-red-500 hover:bg-red-600 text-white'; }
  else if (response) { btnLabel = 'Rerun'; btnCls = 'bg-blue-300 hover:bg-blue-200 text-slate-900'; }
  else { btnLabel = 'Run Test'; btnCls = 'bg-green-500 hover:bg-green-600 text-white'; }

  var sr = (response && response.scenarioResults) || [];
  var totalS = sr.length;
  var passedS = sr.filter(function (s) { return s.passed; }).length;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col overflow-hidden transition-all duration-300 ease-out"
      style={{ height: expanded ? '45vh' : '48px' }}
    >
      <div
        className="h-12 shrink-0 flex items-center justify-between px-5 bg-navy-900 border-t border-slate-600/30 shadow-[0_-1px_4px_rgba(0,0,0,0.4)] cursor-pointer select-none"
        onClick={toggleResultsBar}
      >
        <div className="flex items-center gap-2 text-[13px]">{status}</div>
        <div className="flex items-center gap-2">
          <Chevron up={!expanded} />
          {canRun ? (
            <button
              type="button"
              onClick={function (e) { e.stopPropagation(); handleRun(); }}
              className={'px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-colors duration-300 border-none ' + btnCls}
            >
              {btnLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={'flex-1 min-h-0 overflow-y-auto bg-navy-950 p-4 transition-opacity duration-200 ' + (expanded ? 'opacity-100 delay-150' : 'opacity-0')}
      >
        <div className="flex flex-col gap-3">
        {isPreflightFailure && (
          <React.Fragment>
            <div className="font-semibold text-red-500 text-[13px]">Pre-flight errors</div>
            {preflightErrors.map(function (e, i) {
              return <div key={i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">{e.message}</div>;
            })}
          </React.Fragment>
        )}

        {splAnalysis.unauthorizedCommands.length > 0 && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-300">
            <strong>Unauthorized commands detected:</strong>{' '}
            {splAnalysis.unauthorizedCommands.join(', ')}
          </div>
        )}

        {splAnalysis.unusualCommands.length > 0 && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-[13px] text-amber-300">
            <strong>Unusual commands:</strong>{' '}
            {splAnalysis.unusualCommands.join(', ')}
          </div>
        )}

        {splAnalysis.uniqLimitations && (
          <div className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-[13px] text-amber-300">
            <strong>Note:</strong> {splAnalysis.uniqLimitations}
          </div>
        )}

        {displayErrors.map(function (e, i) {
          return (
            <div key={'e' + i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">
              {e.message}
              {e.tip ? <div className="text-slate-400 mt-1 text-xs">{e.tip}</div> : null}
            </div>
          );
        })}

        {warnings.map(function (w, i) {
          return <div key={'w' + i} className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-navy-800 text-[13px] text-slate-200">{w.message}</div>;
        })}

        {!response && !isRunning && !isPreflightFailure && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg className="w-10 h-10 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
            </svg>
            <p className="text-sm text-slate-400 m-0">Run the test to see results here</p>
            <p className="text-xs text-slate-500 mt-1 m-0">Click the Run Test button or navigate to the last step</p>
          </div>
        )}

        {sr.map(function (s, i) { return <ScenarioResultCard key={i} result={s} />; })}

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
