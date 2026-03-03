import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectTestResponse, selectErrors, selectWarnings } from 'core/store/selectors';
import type { ScenarioResult, TestResponse } from 'core/types';
import { Message } from '../../common';
import { ScenarioResultCard } from './ScenarioResultCard';

const ResultsRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SummaryBar = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const ScenarioList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export function ResultsPanel() {
  const state = useTestStore();
  const response = selectTestResponse(state);
  const errors = selectErrors(state);
  const warnings = selectWarnings(state);

  if (!response) {
    return (
      <SummaryBar>No results yet. Run the test to see validation details.</SummaryBar>
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
    <ResultsRoot>
      <SummaryBar>{summaryText}</SummaryBar>

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

      <ScenarioList>
        {response.scenarioResults.map((sr: ScenarioResult) => (
          <ScenarioResultCard key={sr.scenarioId} result={sr} />
        ))}
      </ScenarioList>
    </ResultsRoot>
  );
}

