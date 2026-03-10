/**
 * File slice: saveToFile, loadFromFile.
 */

import type { EntityId, TestDefinition } from '../../types';
import { buildPayload } from '../../../utils/payloadBuilder';
import type { ApiPayload } from '../../../utils/payloadBuilder';
import { DEFAULT_TIME_RANGE } from '../../constants/defaults';

const SAVE_VERSION = 2;

/** Serialized save format. */
export interface SavedState {
  version: number;
  savedAt: string;
  activeTestId: EntityId | null;
  testDefinition: TestDefinition[];
  payload: ApiPayload[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetState = (recipe: (draft: any) => void) => void;
type GetState = () => { tests: TestDefinition[]; activeTestId: EntityId | null };

export function fileSlice(set: SetState, get: GetState) {
  return {
    saveToFile: () => {
      const state = get();
      const saved: SavedState = {
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        activeTestId: state.activeTestId,
        testDefinition: state.tests,
        payload: state.tests.map((t) => buildPayload(t)),
      };
      const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splunk-query-tester-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    loadFromFile: (content: string): { success: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed.version !== 'number') {
          return { success: false, error: 'Invalid file: missing version' };
        }
        // Support both v1 (tests) and v2 (testDefinition) formats
        const tests = parsed.testDefinition ?? parsed.tests ?? [];
        // Backfill timeRange for files saved before this feature existed
        for (const t of tests) {
          if (t.query && !t.query.timeRange) {
            t.query.timeRange = { ...DEFAULT_TIME_RANGE };
          }
        }
        set((draft) => {
          draft.tests = tests;
          draft.activeTestId = parsed.activeTestId ?? (tests[0]?.id ?? null);
          draft.testResponse = null;
        });
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
      }
    },
  };
}
