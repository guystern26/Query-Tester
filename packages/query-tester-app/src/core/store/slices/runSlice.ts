/**
 * Run slice: runTest, cancelTest, setTestResponse, clearResults.
 */

import type { EntityId, TestDefinition, TestResponse } from '../../types';
import { mockRunTest } from '../../../utils/mockResults';

// TODO: Replace mockRunTest with real API call: testApi.runTest(buildPayload(test))

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

      abortController = new AbortController();

      set((draft) => {
        draft.isRunning = true;
        draft.testResponse = null;
      });

      try {
        const response = await mockRunTest(test, abortController.signal);
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
              executionTimeMs: 0,
              errors: [],
              warnings: [],
              queryInfo: null,
              summary: null,
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
              executionTimeMs: 0,
              errors: [{ code: 'RUN_FAILED', message: String(e), severity: 'error' }],
              warnings: [],
              queryInfo: null,
              summary: null,
              scenarioResults: [],
            };
          });
        }
      } finally {
        abortController = null;
      }
    },

    cancelTest: () => {
      if (abortController) abortController.abort();
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
