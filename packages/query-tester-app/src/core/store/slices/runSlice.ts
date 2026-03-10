/**
 * Run slice: runTest, cancelTest, setTestResponse, clearResults.
 */

import type { EntityId, TestDefinition, TestResponse } from '../../types';
import { runTest, cancelTestOnBackend } from '../../../api/testApi';
import { buildPayload } from '../../../utils/payloadBuilder';

const EMPTY_SPL_ANALYSIS = {
  unauthorizedCommands: [] as string[],
  unusualCommands: [] as string[],
  uniqLimitations: null,
  commandsUsed: [] as string[],
};

let abortController: AbortController | null = null;

type SetState = (recipe: (draft: {
  tests: TestDefinition[];
  activeTestId: EntityId | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
  resultsBarExpanded: boolean;
}) => void) => void;
type GetState = () => {
  tests: TestDefinition[];
  activeTestId: EntityId | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
  resultsBarExpanded: boolean;
};

export function runSlice(set: SetState, get: GetState) {
  return {
    runTest: async () => {
      const { tests, activeTestId } = get();
      const test = activeTestId ? tests.find((t) => t.id === activeTestId) : null;
      if (!test) return;

      // Pre-flight: check for query_data inputs with empty SPL
      if (test.testType !== 'query_only') {
        for (const s of test.scenarios) {
          for (const inp of s.inputs) {
            if (inp.inputMode === 'query_data' && !inp.queryDataConfig.spl.trim()) {
              set((draft) => {
                draft.testResponse = {
                  status: 'error',
                  message: 'Query Data input in scenario "' + (s.name || 'Scenario') + '" has an empty sub-query. Enter a SPL query or switch to a different input mode.',
                  testName: test.name,
                  testType: test.testType,
                  timestamp: new Date().toISOString(),
                  totalScenarios: 0,
                  passedScenarios: 0,
                  warnings: [],
                  splAnalysis: EMPTY_SPL_ANALYSIS,
                  scenarioResults: [],
                  errors: [{ code: 'EMPTY_QUERY_DATA', message: 'Query Data sub-query is empty.', severity: 'error' as const }],
                };
                draft.resultsBarExpanded = true;
              });
              return;
            }
          }
        }
      }

      abortController = new AbortController();

      set((draft) => {
        draft.isRunning = true;
        draft.testResponse = null;
      });

      try {
        const response = await runTest(buildPayload(test), abortController.signal);
        set((draft) => {
          draft.testResponse = response;
          draft.isRunning = false;
          draft.resultsBarExpanded = true;
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err.name === 'AbortError') {
          // Cancel: do NOT auto-expand — just show "Cancelled" inline
          set((draft) => {
            draft.isRunning = false;
            draft.testResponse = {
              status: 'error',
              message: 'Test cancelled by user.',
              testName: test.name,
              testType: test.testType,
              timestamp: new Date().toISOString(),
              totalScenarios: 0,
              passedScenarios: 0,
              warnings: [],
              splAnalysis: EMPTY_SPL_ANALYSIS,
              scenarioResults: [],
            };
          });
        } else {
          set((draft) => {
            draft.isRunning = false;
            draft.resultsBarExpanded = true;
            draft.testResponse = {
              status: 'error',
              message: err instanceof Error ? err.message : 'Run failed',
              testName: test.name,
              testType: test.testType,
              timestamp: new Date().toISOString(),
              totalScenarios: 0,
              passedScenarios: 0,
              warnings: [],
              splAnalysis: EMPTY_SPL_ANALYSIS,
              scenarioResults: [],
              errors: [{ code: 'RUN_FAILED', message: String(e), severity: 'error' }],
            };
          });
        }
      } finally {
        abortController = null;
      }
    },

    cancelTest: () => {
      if (abortController) abortController.abort();
      cancelTestOnBackend();
    },

    setTestResponse: (response: TestResponse | null) =>
      set((draft) => {
        draft.testResponse = response;
        draft.isRunning = false;
        if (response !== null) {
          draft.resultsBarExpanded = true;
        }
      }),

    clearResults: () =>
      set((draft) => {
        draft.testResponse = null;
      }),

    toggleResultsBar: () =>
      set((draft) => {
        draft.resultsBarExpanded = !draft.resultsBarExpanded;
      }),

    setResultsBarExpanded: (expanded: boolean) =>
      set((draft) => {
        draft.resultsBarExpanded = expanded;
      }),
  };
}
