/**
 * File slice: saveToFile, loadFromFile.
 */

import type { EntityId, TestDefinition } from '../../types';

const SAVE_VERSION = 1;

/** Serialized save format. Spec 15.2 */
export interface SavedState {
  version: number;
  savedAt: string;
  activeTestId: EntityId | null;
  tests: TestDefinition[];
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
        tests: state.tests,
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
        const parsed = JSON.parse(content) as SavedState;
        if (typeof parsed.version !== 'number') {
          return { success: false, error: 'Invalid file: missing version' };
        }
        set((draft) => {
          draft.tests = parsed.tests ?? [];
          draft.activeTestId = parsed.activeTestId ?? (parsed.tests?.[0]?.id ?? null);
          draft.testResponse = null;
        });
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
      }
    },
  };
}
