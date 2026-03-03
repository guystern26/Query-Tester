import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectTestResponse, selectErrors, selectWarnings } from 'core/store/selectors';
import { validateBeforeRun } from '../../utils/preflight';
import { ScenarioResultCard } from './ScenarioResultCard';

export interface ResultsBarProps {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${up ? '' : 'rotate-180'}`}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function ResultsBar({ expanded, setExpanded }: ResultsBarProps) {
  const store = useTestStore();
  const test = selectActiveTest(store);
  const response = selectTestResponse(store);
  const errors = selectErrors(store);
  const warnings = selectWarnings(store);
  const { isRunning } = store;
  const [preflight, setPreflight] = useState<string[]>([]);

  /* status text */
  let status: React.ReactNode;
  if (isRunning) {
    status = (
      <>
        <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-cyan-400">Running query...</span>
      </>
    );
  } else if (preflight.length > 0) {
    status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{preflight.length} pre-flight error(s)</span></>;
  } else if (response) {
    const sr = response.scenarioResults;
    const t = sr.length;
    const p = sr.filter((s) => s.passed).length;
    if (response.status === 'error' && t === 0) {
      status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{response.message}</span></>;
    } else if (p < t) {
      status = <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500">{t - p}/{t} scenarios failed</span></>;
    } else {
      status = <><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /><span className="text-green-400">{p}/{t} scenarios passed</span></>;
    }
  } else {
    status = <span className="text-slate-400">Ready to run</span>;
  }

  /* run handler */
  const handleRun = () => {
    if (!test) return;
    if (isRunning) { store.cancelTest(); return; }
    setPreflight([]);
    const errs = validateBeforeRun(test);
    if (errs.length > 0) { setPreflight(errs); setExpanded(true); return; }
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
      className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col overflow-hidden transition-all duration-300"
      style={{ height: expanded ? '45vh' : '48px' }}
    >
      {/* Summary row */}
      <div className="h-12 shrink-0 flex items-center justify-between px-5 bg-slate-900 border-t-2 border-slate-700">
        <div className="flex items-center gap-2 text-[13px]">{status}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="bg-transparent border-none text-slate-400 cursor-pointer p-1 px-2 flex items-center transition-colors hover:text-slate-100"
          >
            <Chevron up={!expanded} />
          </button>
          <button
            type="button"
            onClick={handleRun}
            className={`px-4 py-1.5 rounded-md text-[13px] font-semibold text-white cursor-pointer transition-colors border-none ${btnCls}`}
          >
            {btnLabel}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 flex flex-col gap-3">
          {preflight.length > 0 && (
            <>
              <div className="font-semibold text-red-500 text-[13px]">Pre-flight errors</div>
              {preflight.map((e, i) => (
                <div key={i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-slate-800 text-[13px] text-slate-200">{e}</div>
              ))}
            </>
          )}
          {errors.map((e, i) => (
            <div key={`e${i}`} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-slate-800 text-[13px] text-slate-200">
              {e.message}
              {e.tip && <div className="text-slate-400 mt-1 text-xs">{e.tip}</div>}
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={`w${i}`} className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-slate-800 text-[13px] text-slate-200">{w.message}</div>
          ))}
          {sr.map((s) => <ScenarioResultCard key={s.scenarioId} result={s} />)}
          {totalS > 0 && (
            <div className="py-2 border-t border-slate-700 text-[13px] text-slate-400">
              Total: {passedS} passed, {totalS - passedS} failed{errors.length > 0 ? `, ${errors.length} errors` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
