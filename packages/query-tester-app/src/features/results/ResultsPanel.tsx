import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectTestResponse, selectErrors, selectWarnings } from 'core/store/selectors';
import type { ScenarioResult } from 'core/types';
import { Message } from '../../common';
import { ScenarioResultCard } from './ScenarioResultCard';

export function ResultsPanel() {
  const state = useTestStore();
  const response = selectTestResponse(state);
  const errors = selectErrors(state);
  const warnings = selectWarnings(state);

  if (!response) {
    return (
      <div className="text-sm text-slate-400">No results yet. Run the test to see validation details.</div>
    );
  }

  const summary = response.summary;
  let summaryText = '';
  if (summary) {
    summaryText = `${summary.passedScenarios}/${summary.totalScenarios} scenarios passed`;
  } else {
    const scenarioResults = response.scenarioResults;
    const total = scenarioResults.length;
    const passed = scenarioResults.filter((s) => s.passed).length;
    summaryText = `${passed}/${total} scenarios passed`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-slate-400">{summaryText}</div>

      {errors.map((err) => (
        <Message key={err.code} type="error">
          {err.message}
        </Message>
      ))}

      {warnings.map((w) => (
        <Message key={w.code} type="warning">
          {w.message}
        </Message>
      ))}

      <div className="flex flex-col gap-3">
        {response.scenarioResults.map((sr: ScenarioResult) => (
          <ScenarioResultCard key={sr.scenarioId} result={sr} />
        ))}
      </div>
    </div>
  );
}
