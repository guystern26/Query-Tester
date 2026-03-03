/**
 * Run slice: runTest, cancelTest, setTestResponse, clearResults.
 */

import type { EntityId, TestDefinition, TestResponse } from '../../types';
import { buildPayload } from '../../../utils/payloadBuilder';

const RUN_TEST_TIMEOUT_MS = 120_000;

let abortController: AbortController | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let runAbortedByTimeout = false;

type SetState = (recipe: (draft: {
  tests: TestDefinition[];
  activeTestId: EntityId | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
}) => void) => void;
type GetState = () => {
  tests: TestDefinition[];
  activeTestId: EntityId | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
};

export function runSlice(set: SetState, get: GetState) {
  return {
    runTest: async (options?: { endpoint?: string }) => {
      const { tests, activeTestId } = get();
      const test = activeTestId ? tests.find((t) => t.id === activeTestId) : null;
      if (!test) return;

      runAbortedByTimeout = false;
      abortController = new AbortController();
      timeoutId = setTimeout(() => {
        runAbortedByTimeout = true;
        abortController?.abort();
      }, RUN_TEST_TIMEOUT_MS);

      set((draft) => {
        draft.isRunning = true;
      });

      try {
        const payload = buildPayload(test);
        const endpoint = options?.endpoint ?? '/servicesNS/nobody/search/search/run_test';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });
        const data = (await res.json()) as TestResponse;
        set((draft) => {
          draft.testResponse = data;
          draft.isRunning = false;
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err.name === 'AbortError') {
          set((draft) => {
            draft.isRunning = false;
            draft.testResponse = {
              status: 'error',
              message: runAbortedByTimeout ? 'Test timed out after 2 minutes.' : 'Test cancelled by user.',
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
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
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
      }),

    clearResults: () =>
      set((draft) => {
        draft.testResponse = null;
      }),
  };
}
