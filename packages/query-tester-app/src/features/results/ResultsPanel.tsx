import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectTestResponse } from 'core/store/selectors';
import { ScenarioResultCard } from './ScenarioResultCard';

export function ResultsPanel() {
  const state = useTestStore();
  const response = selectTestResponse(state);

  if (!response) {
    return (
      <div className="text-sm text-slate-400">No results yet. Run the test to see validation details.</div>
    );
  }

  const summaryText = response.passedScenarios + '/' + response.totalScenarios + ' scenarios passed';

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-slate-400">{summaryText}</div>

      {/* splAnalysis: unauthorized commands = error banner */}
      {response.splAnalysis && response.splAnalysis.unauthorizedCommands.length > 0 && (
        <div className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-300">
          <strong>Unauthorized commands detected:</strong>{' '}
          {response.splAnalysis.unauthorizedCommands.join(', ')}
        </div>
      )}

      {/* splAnalysis: unusual commands = warning banner */}
      {response.splAnalysis && response.splAnalysis.unusualCommands.length > 0 && (
        <div className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-[13px] text-amber-300">
          <strong>Unusual commands:</strong>{' '}
          {response.splAnalysis.unusualCommands.join(', ')}
        </div>
      )}

      {/* Frontend-only errors (preflight) */}
      {(response.errors ?? []).map((err, i) => (
        <div key={i} className="px-3 py-2.5 rounded-md border-l-4 border-red-500 bg-navy-800 text-[13px] text-slate-200">
          {err.message}
          {err.tip && <div className="text-slate-400 mt-1 text-xs">{err.tip}</div>}
        </div>
      ))}

      {/* Backend warnings */}
      {response.warnings.map((w, i) => (
        <div key={i} className="px-3 py-2.5 rounded-md border-l-4 border-amber-500 bg-navy-800 text-[13px] text-slate-200">
          {w.message}
        </div>
      ))}

      <div className="flex flex-col gap-3">
        {response.scenarioResults.map((sr, i) => (
          <ScenarioResultCard key={i} result={sr} />
        ))}
      </div>
    </div>
  );
}
