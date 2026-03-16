/**
 * Test Library slice: CRUD operations for saved tests via savedTestsApi.
 */

import type { SavedTestFull } from '../../types';
import { savedTestsApi } from '../../../api/savedTestsApi';
import type { SetState, GetState } from './testLibraryTypes';
import { errMsg, assertUniqueName, getActiveTest } from './testLibraryTypes';

export type { TestLibraryState } from './testLibraryTypes';
export { testLibraryInitialState } from './testLibraryTypes';

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

        saveCurrentTest: async (name: string, description: string) => {
            set((draft) => {
                draft.isSaving = true;
                draft.libraryError = null;
            });
            try {
                const state = get();
                assertUniqueName(state.savedTests, name);
                const activeTest = getActiveTest(state);
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
                assertUniqueName(state.savedTests, name, id);
                const activeTest = getActiveTest(state);
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
            set((draft) => { draft.libraryError = null; });
            try {
                await savedTestsApi.deleteTest(id);
                set((draft) => {
                    draft.savedTests = draft.savedTests.filter((t) => t.id !== id);
                });
            } catch (e) {
                set((draft) => { draft.libraryError = errMsg(e); });
            }
        },

        clearLibraryError: () => { set((draft) => { draft.libraryError = null; }); },
    };
}
