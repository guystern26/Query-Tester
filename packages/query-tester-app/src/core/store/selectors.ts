/**
 * Selectors for test store. Spec 17.6.
 */

import type { EntityId, TestDefinition } from '../types';
import type { TestStoreState } from './testStore';
import type { TestResponse, ResponseMessage, SplWarning } from '../types';

export function selectErrors(s: TestStoreState): ResponseMessage[] {
  return s.testResponse?.errors ?? [];
}

export function selectWarnings(s: TestStoreState): SplWarning[] {
  return s.testResponse?.warnings ?? [];
}

export function selectHasResults(s: TestStoreState): boolean {
  return (s.testResponse?.scenarioResults?.length ?? 0) > 0;
}

export function selectActiveTest(s: TestStoreState): TestDefinition | null {
  if (!s.activeTestId) return null;
  return s.tests.find((t) => t.id === s.activeTestId) ?? null;
}

export function selectActiveTestId(s: TestStoreState): EntityId | null {
  return s.activeTestId;
}

export function selectTests(s: TestStoreState): TestDefinition[] {
  return s.tests;
}

export function selectTestCount(s: TestStoreState): number {
  return s.tests.length;
}

export function selectActiveTestIndex(s: TestStoreState): number {
  if (!s.activeTestId) return -1;
  const idx = s.tests.findIndex((t) => t.id === s.activeTestId);
  return idx;
}

export function selectTestResponse(s: TestStoreState): TestResponse | null {
  return s.testResponse;
}

export function selectIsRunning(s: TestStoreState): boolean {
  return s.isRunning;
}

/** Select a scenario by id from the active test. */
export function selectScenario(s: TestStoreState, scenarioId: EntityId) {
  const test = selectActiveTest(s);
  return test?.scenarios.find((sc) => sc.id === scenarioId) ?? null;
}

/** Select an input by id from a given scenario (by id) on the active test. */
export function selectInput(
  s: TestStoreState,
  scenarioId: EntityId,
  inputId: EntityId
) {
  const scenario = selectScenario(s, scenarioId);
  return scenario?.inputs.find((i) => i.id === inputId) ?? null;
}
