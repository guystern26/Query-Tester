import React from 'react';
import styled from 'styled-components';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { Button, Card } from '../../common';
import { TopBar } from '../../components/test-navigation/TopBar';
import { TestTypeSelector } from '../../features/scenarios/TestTypeSelector';
import { QuerySection } from '../../features/query/QuerySection';
import { ScenarioPanel } from '../../features/scenarios/ScenarioPanel';
import { ValidationSection } from '../../features/validation/ValidationSection';
import { ResultsPanel } from '../../features/results/ResultsPanel';
import { validateBeforeRun } from '../../utils/preflight';

const PageRoot = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const ContentShell = styled.div`
  flex: 1;
  padding: 16px 24px 24px;
  overflow-x: auto;
  overflow-y: hidden;
`;

const BoardRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
`;

const Column = styled.div`
  flex: 0 0 420px;
  min-height: calc(100vh - 72px);
  display: flex;
  flex-direction: column;
  animation: fade-in-section 0.3s ease forwards;
`;

const ColumnHeader = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 8px;
`;

const ColumnBody = styled(Card)`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export function StartPage() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const app = activeTest?.app ?? '';
  const testType = activeTest?.testType ?? 'standard';
  const hasApp = app.trim() !== '';
  const hasQuery = (activeTest?.query.spl ?? '').trim() !== '';
  const hasScenariosWithInputs =
    (activeTest?.scenarios?.length ?? 0) > 0 &&
    (activeTest?.scenarios?.some((s) => (s.inputs?.length ?? 0) > 0) ?? false);
  const hasValidation =
    (activeTest?.validation?.fieldConditions?.length ?? 0) > 0 ||
    (activeTest?.validation?.approach === 'expected_result' &&
      (activeTest?.validation?.expectedResultJson ?? '').trim() !== '');

  const handleAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTest) state.updateApp(activeTest.id, e.target.value);
  };

  const handleRunClick = () => {
    if (!activeTest) return;

    if (state.isRunning) {
      state.cancelTest();
      return;
    }

    const errors = validateBeforeRun(activeTest);
    if (errors.length > 0) {
      // For now, surface only the first error.
      // This can later be wired into a nicer inline UI.
      alert(errors[0]);
      return;
    }

    void state.runTest();
  };

  const hasValidationContent =
    testType === 'query_only' ||
    hasValidation;

  let runLabel = 'Run Test';
  let runVariant: 'primary' | 'secondary' | 'danger' = 'primary';
  if (state.isRunning) {
    runLabel = 'Cancel';
    runVariant = 'danger';
  } else if (state.testResponse) {
    runLabel = 'Rerun Test';
    runVariant = 'secondary';
  }

  return (
    <PageRoot>
      <TopBar />

      <ContentShell>
        <TestTypeSelector />
        <BoardRow>
          {/* Query column */}
          <Column>
            <ColumnHeader>Query</ColumnHeader>
            <ColumnBody>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 4,
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  App name
                </label>
                <input
                  type="text"
                  value={app}
                  onChange={handleAppChange}
                  placeholder="e.g. search"
                  style={{
                    padding: 'var(--radius-sm) var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {hasApp && <QuerySection />}
            </ColumnBody>
          </Column>

          {/* Data / Scenarios column */}
          {hasApp && hasQuery && testType === 'standard' && (
            <Column>
              <ColumnHeader>Data / Scenarios</ColumnHeader>
              <ColumnBody>
                <ScenarioPanel />
              </ColumnBody>
            </Column>
          )}

          {/* Validation column */}
          {hasApp && hasQuery && (testType === 'query_only' || hasScenariosWithInputs) && (
            <Column>
              <ColumnHeader>Validation</ColumnHeader>
              <ColumnBody>
                <ValidationSection />
                <Button
                  variant={runVariant}
                  size="lg"
                  disabled={!state.isRunning && !hasValidationContent}
                  onClick={handleRunClick}
                >
                  {state.isRunning ? 'Cancel ⏳' : runLabel}
                </Button>
              </ColumnBody>
            </Column>
          )}

          {/* Results column */}
          {(state.testResponse != null || state.isRunning) && (
            <Column>
              <ColumnHeader>Results</ColumnHeader>
              <ColumnBody>
                <ResultsPanel />
              </ColumnBody>
            </Column>
          )}
        </BoardRow>
      </ContentShell>
    </PageRoot>
  );
}
