/**
 * Test Library slice: save/load tests from KVStore via savedTestsApi.
 */

import type { EntityId, TestDefinition, TestResponse, SavedTestFull } from '../../types';
import { savedTestsApi } from '../../../api/savedTestsApi';
import { getSavedSearchSpl } from '../../../api/splunkApi';
import { DEFAULT_TIME_RANGE } from '../../constants/defaults';

export interface TestLibraryState {
    savedTests: SavedTestFull[];
    isLoadingLibrary: boolean;
    isSaving: boolean;
    libraryError: string | null;
    splDriftWarning: string | null;
}

type StoreState = {
    tests: TestDefinition[];
    activeTestId: EntityId | null;
    testResponse: TestResponse | null;
    savedTestId: string | null;
    savedTestVersion: number | null;
    hasUnsavedChanges: boolean;
} & TestLibraryState;

type SetState = (recipe: (draft: StoreState) => void) => void;
type GetState = () => StoreState;

export const testLibraryInitialState: TestLibraryState = {
    savedTests: [],
    isLoadingLibrary: false,
    isSaving: false,
    libraryError: null,
    splDriftWarning: null,
};

function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/** Prepare a definition for loading into the builder, backfilling missing fields. */
function prepareDefinition(full: SavedTestFull): TestDefinition {
    const def = { ...full.definition };
    if (!def.name && full.name) def.name = full.name;
    if (def.query && !def.query.timeRange) {
        def.query.timeRange = { ...DEFAULT_TIME_RANGE };
    }
    return def;
}

export function testLibrarySlice(set: SetState, get: GetState) {
    return {
        fetchSavedTests: async () => {
            set((draft) => {
                draft.isLoadingLibrary = true;
                draft.libraryError = null;
            });
            try {
                const tests = await savedTestsApi.listTests();
                set((draft) => {
                    draft.savedTests = tests;
                    draft.isLoadingLibrary = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingLibrary = false;
                    draft.libraryError = errMsg(e);
                });
            }
        },

        loadTestFromPayload: (full: SavedTestFull): void => {
            if (!full || !full.definition) return;
            const def = prepareDefinition(full);
            set((draft) => {
                draft.tests = [def];
                draft.activeTestId = def.id;
                draft.testResponse = null;
                draft.savedTestId = full.id;
                draft.savedTestVersion = full.version ?? null;
                draft.hasUnsavedChanges = false;
            });
        },

        loadTestIntoBuilder: (id: string): string => {
            const state = get();
            const full = state.savedTests.find((t) => t.id === id);
            if (!full || !full.definition) {
                set((draft) => { draft.libraryError = 'Test not found in library.'; });
                throw new Error('Test not found');
            }
            const def = prepareDefinition(full);
            set((draft) => {
                draft.tests = [def];
                draft.activeTestId = def.id;
                draft.testResponse = null;
                draft.savedTestId = id;
                draft.savedTestVersion = full.version ?? null;
                draft.hasUnsavedChanges = false;
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

        saveCurrentTest: async (name: string, description: string) => {
            set((draft) => {
                draft.isSaving = true;
                draft.libraryError = null;
            });
            try {
                const state = get();
                const duplicate = state.savedTests.find(
                    (t) => t.name.toLowerCase() === name.toLowerCase()
                );
                if (duplicate) {
                    throw new Error('A test named "' + name + '" already exists. Choose a different name.');
                }
                const activeTest = state.tests.find((t) => t.id === state.activeTestId);
                if (!activeTest) {
                    throw new Error('No active test to save.');
                }
                const defWithName = { ...activeTest, name };
                const saved = await savedTestsApi.saveTest({
                    name,
                    description,
                    definition: defWithName,
                });
                set((draft) => {
                    draft.savedTests.unshift(saved);
                    draft.isSaving = false;
                    draft.savedTestId = saved.id;
                    draft.savedTestVersion = saved.version ?? 1;
                    draft.hasUnsavedChanges = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isSaving = false;
                    draft.libraryError = errMsg(e);
                });
            }
        },

        updateSavedTest: async (id: string, name: string, description: string) => {
            set((draft) => {
                draft.isSaving = true;
                draft.libraryError = null;
            });
            try {
                const state = get();
                const duplicate = state.savedTests.find(
                    (t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase()
                );
                if (duplicate) {
                    throw new Error('A test named "' + name + '" already exists. Choose a different name.');
                }
                const activeTest = state.tests.find((t) => t.id === state.activeTestId);
                if (!activeTest) {
                    throw new Error('No active test to save.');
                }
                const effectiveName = name || activeTest.name || '';
                const defWithName = { ...activeTest, name: effectiveName };
                const version = state.savedTestVersion ?? undefined;
                const updated = await savedTestsApi.updateTest(id, {
                    name: effectiveName,
                    description,
                    definition: defWithName,
                    version,
                });
                set((draft) => {
                    const idx = draft.savedTests.findIndex((t) => t.id === id);
                    if (idx !== -1) {
                        draft.savedTests[idx] = updated;
                    }
                    draft.isSaving = false;
                    draft.savedTestVersion = updated.version ?? null;
                    draft.hasUnsavedChanges = false;
                });
            } catch (e) {
                const isConflict = e instanceof Error && 'status' in e && (e as any).status === 409;
                set((draft) => {
                    draft.isSaving = false;
                    draft.libraryError = isConflict
                        ? 'This test was modified by someone else — please reload before saving.'
                        : errMsg(e);
                });
            }
        },

        deleteSavedTest: async (id: string) => {
            set((draft) => {
                draft.libraryError = null;
            });
            try {
                await savedTestsApi.deleteTest(id);
                set((draft) => {
                    draft.savedTests = draft.savedTests.filter((t) => t.id !== id);
                });
            } catch (e) {
                set((draft) => {
                    draft.libraryError = errMsg(e);
                });
            }
        },

        clearLibraryError: () => {
            set((draft) => {
                draft.libraryError = null;
            });
        },

        clearSplDriftWarning: () => {
            set((draft) => {
                draft.splDriftWarning = null;
            });
        },

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
