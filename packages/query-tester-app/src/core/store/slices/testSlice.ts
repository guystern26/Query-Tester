/**
 * Test CRUD slice: add, delete, duplicate, rename, setActive, updateType, updateApp, setFieldExtraction.
 */

import type { EntityId, TestType, ExtractedDataSource, TestDefinition } from '../../types';
import { genId, createDefaultTest } from '../../constants/defaults';
import { MAX_TESTS_PER_SESSION } from '../../constants/limits';
import { findTest, deepCloneTestWithNewIds } from './helpers';

type SliceState = { tests: TestDefinition[]; activeTestId: EntityId | null; testResponse: unknown | null; savedTestId: string | null; hasUnsavedChanges: boolean };
type SetState = (recipe: (draft: SliceState) => void) => void;
type GetState = () => SliceState;

export function testSlice(set: SetState, _get: GetState) {
  return {
    addTest: () =>
      set((draft) => {
        if (draft.tests.length >= MAX_TESTS_PER_SESSION) return;
        const newTest = createDefaultTest();
        newTest.id = genId();
        draft.tests.push(newTest);
        draft.activeTestId = newTest.id;
        draft.savedTestId = null;
        draft.hasUnsavedChanges = false;
      }),

    resetToNewTest: () =>
      set((draft) => {
        const fresh = createDefaultTest();
        draft.tests = [fresh];
        draft.activeTestId = fresh.id;
        draft.testResponse = null;
        draft.savedTestId = null;
        draft.hasUnsavedChanges = false;
      }),

    deleteTest: (testId: EntityId) =>
      set((draft) => {
        if (draft.tests.length <= 1) return;
        const idx = draft.tests.findIndex((t) => t.id === testId);
        if (idx === -1) return;
        draft.tests.splice(idx, 1);
        if (draft.activeTestId === testId) {
          draft.activeTestId = draft.tests[Math.max(0, idx - 1)]?.id ?? null;
          draft.testResponse = null;
        }
      }),

    duplicateTest: (testId: EntityId) =>
      set((draft) => {
        if (draft.tests.length >= MAX_TESTS_PER_SESSION) return;
        const test = draft.tests.find((t) => t.id === testId);
        if (!test) return;
        const copy = deepCloneTestWithNewIds(test);
        draft.tests.push(copy);
        draft.activeTestId = copy.id;
      }),

    updateTestName: (testId: EntityId, name: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.name = name;
      }),

    setActiveTest: (testId: EntityId | null) =>
      set((draft) => {
        if (draft.activeTestId !== testId) {
          draft.testResponse = null;
        }
        draft.activeTestId = testId;
      }),

    updateTestType: (testId: EntityId, testType: TestType) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.testType = testType;
      }),

    updateApp: (testId: EntityId, app: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) {
          t.app = app;
          t.query.savedSearchOrigin = null;
          for (const s of t.scenarios) {
            for (const inp of s.inputs) {
              inp.queryDataConfig.savedSearchName = null;
            }
          }
        }
      }),

    setFieldExtraction: (testId: EntityId, sources: ExtractedDataSource[]) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.fieldExtraction = { sources, timestamp: new Date().toISOString() };
      }),
  };
}
