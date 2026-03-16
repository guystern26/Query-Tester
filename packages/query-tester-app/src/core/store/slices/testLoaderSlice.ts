/**
 * Test Loader slice: loading saved tests into the builder + SPL drift detection.
 */

import type { SavedTestFull } from '../../types';
import { getSavedSearchSpl } from '../../../api/splunkApi';
import type { SetState, GetState } from './testLibraryTypes';
import { applyTestToBuilder, errMsg } from './testLibraryTypes';

export function testLoaderSlice(set: SetState, get: GetState) {
    return {
        loadTestFromPayload: (full: SavedTestFull): void => {
            if (!full || !full.definition) return;
            set((draft) => { applyTestToBuilder(draft, full, full.id); });
        },

        loadTestIntoBuilder: (id: string): string => {
            const state = get();
            const full = state.savedTests.find((t) => t.id === id);
            if (!full || !full.definition) {
                set((draft) => { draft.libraryError = 'Test not found in library.'; });
                throw new Error('Test not found');
            }
            set((draft) => {
                applyTestToBuilder(draft, full, id);
                draft.splDriftWarning = null;
            });

            // Fire-and-forget SPL drift check
            const origin = full.definition?.query?.savedSearchOrigin;
            const app = full.app || full.definition?.app;
            if (origin && app) {
                getSavedSearchSpl(app, origin)
                    .then((currentSpl) => {
                        const storedSpl = full.definition.query?.spl ?? '';
                        if (currentSpl.trim() !== storedSpl.trim()) {
                            set((draft) => {
                                draft.splDriftWarning =
                                    'The saved search "' + origin + '" has changed since this test was last saved.';
                            });
                        }
                    })
                    .catch(() => {
                        set((draft) => {
                            draft.splDriftWarning =
                                'The saved search "' + origin + '" could not be found. It may have been deleted or renamed.';
                        });
                    });
            }

            return full.name;
        },

        clearSplDriftWarning: () => { set((draft) => { draft.splDriftWarning = null; }); },

        reloadDriftedSpl: async () => {
            const state = get();
            const activeTest = state.tests.find((t) => t.id === state.activeTestId);
            const origin = activeTest?.query?.savedSearchOrigin;
            const app = activeTest?.app;
            if (!activeTest || !origin || !app) return;
            try {
                const currentSpl = await getSavedSearchSpl(app, origin);
                set((draft) => {
                    const test = draft.tests.find((t) => t.id === draft.activeTestId);
                    if (test) {
                        test.query.spl = currentSpl;
                    }
                    draft.splDriftWarning = null;
                });
            } catch {
                set((draft) => {
                    draft.libraryError = 'Failed to reload SPL from saved search.';
                });
            }
        },
    };
}
