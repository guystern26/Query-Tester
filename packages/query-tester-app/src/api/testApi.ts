/**
 * Test run API. Mock implementation for local dev.
 * TODO: Replace with real POST to run_test endpoint.
 */

import type { TestResponse, TestType } from 'core/types';

/** Payload shape sent to run_test (matches buildPayload output). */
export interface RunTestPayload {
  testName: string;
  testType: TestType;
  app: string;
  query: string;
  [key: string]: unknown;
}

/**
 * Runs a test and returns the response. Mock: resolves after 2s with a fake TestResponse.
 * Respects AbortSignal (clears delay and rejects with AbortError if aborted).
 */
export async function runTest(
  payload: RunTestPayload,
  signal: AbortSignal
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const mock: TestResponse = {
        status: 'success',
        message: 'Mock run completed.',
        testName: payload.testName ?? 'Untitled Test',
        testType: payload.testType ?? 'standard',
        timestamp: new Date().toISOString(),
        executionTimeMs: 2000,
        errors: [],
        warnings: [],
        queryInfo: {
          executedQuery: payload.query ?? '',
          executionTimeMs: 2000,
          resultCount: 0,
          scanCount: 0,
        },
        summary: {
          totalScenarios: 0,
          passedScenarios: 0,
          failedScenarios: 0,
          totalInputs: 0,
          totalEvents: 0,
          validationType: 'standard',
        },
        scenarioResults: [],
      };
      resolve(mock);
    }, 2000);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}
