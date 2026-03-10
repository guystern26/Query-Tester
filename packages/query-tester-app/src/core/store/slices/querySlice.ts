/**
 * Query slice: updateSpl, loadSavedSearchSpl, setTimeRange.
 */

import type { EntityId, TestDefinition, TimeRange } from '../../types';
import { findTest } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

export function querySlice(set: SetState) {
  return {
    updateSpl: (testId: EntityId, spl: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.query.spl = spl;
      }),

    loadSavedSearchSpl: (testId: EntityId, spl: string, savedSearchOrigin: string | null) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) {
          t.query.spl = spl;
          t.query.savedSearchOrigin = savedSearchOrigin;
        }
      }),

    setTimeRange: (testId: EntityId, timeRange: TimeRange) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.query.timeRange = timeRange;
      }),
  };
}
