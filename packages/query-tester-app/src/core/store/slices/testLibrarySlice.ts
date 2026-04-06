/** Test Library slice: saved test CRUD + loader + SPL drift detection. */
import type { EntityId, TestDefinition, TestResponse, SavedTestFull } from '../../types';
import { DEFAULT_TIME_RANGE } from '../../constants/defaults';
import { skipNextTestsChange } from '../changeDetectionFlag';
import { savedTestsApi } from '../../../api/savedTestsApi';
import { getSavedSearchSpl } from '../../../api/splunkApi';
import { errMsg } from './helpers';

export interface TestLibraryState {
    savedTests: SavedTestFull[];
    isLoadingLibrary: boolean;
    isSaving: boolean;
    libraryError: string | null;
    splDriftWarning: string | null;
}

type LibraryStoreState = {
    tests: TestDefinition[];
    activeTestId: EntityId | null;
    testResponse: TestResponse | null;
    savedTestId: string | null;
    savedTestVersion: number | null;
    hasUnsavedChanges: boolean;
} & TestLibraryState;

type SetState = (recipe: (draft: LibraryStoreState) => void) => void;
type GetState = () => LibraryStoreState;

function prepareDefinition(full: SavedTestFull): TestDefinition {
    const def = { ...full.definition };
    if (!def.name && full.name) def.name = full.name;
    if (def.query && !def.query.timeRange) def.query.timeRange = { ...DEFAULT_TIME_RANGE };
    return def;
}

function assertUniqueName(tests: SavedTestFull[], name: string, excludeId?: string): void {
    const dup = tests.find((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId);
    if (dup) throw new Error('A test named "' + name + '" already exists. Choose a different name.');
}

function getActiveTest(state: LibraryStoreState): TestDefinition {
    const test = state.tests.find((t) => t.id === state.activeTestId);
    if (!test) throw new Error('No active test to save.');
    return test;
}

function applyTestToBuilder(draft: LibraryStoreState, full: SavedTestFull, savedId: string): void {
    skipNextTestsChange();
    const def = prepareDefinition(full);
    draft.tests = [def];
    draft.activeTestId = def.id;
    draft.testResponse = null;
    draft.savedTestId = savedId;
    draft.savedTestVersion = full.version ?? null;
    draft.hasUnsavedChanges = false;
}

export const testLibraryInitialState: TestLibraryState = {
    savedTests: [], isLoadingLibrary: false, isSaving: false,
    libraryError: null, splDriftWarning: null,
};

export function testLibrarySlice(set: SetState, get: GetState) {
    return {
        // --- CRUD ---
        fetchSavedTests: async () => {
            set((d) => { d.isLoadingLibrary = true; d.libraryError = null; });
            try {
                const tests = await savedTestsApi.listTests();
                set((d) => { d.savedTests = tests; d.isLoadingLibrary = false; });
            } catch (e) {
                set((d) => { d.isLoadingLibrary = false; d.libraryError = errMsg(e); });
            }
        },
        saveCurrentTest: async (name: string, description: string) => {
            set((d) => { d.isSaving = true; d.libraryError = null; });
            try {
                const state = get();
                assertUniqueName(state.savedTests, name);
                const def = { ...getActiveTest(state), name };
                const saved = await savedTestsApi.saveTest({ name, description, definition: def });
                set((d) => {
                    d.savedTests.unshift(saved); d.isSaving = false;
                    d.savedTestId = saved.id; d.savedTestVersion = saved.version ?? 1;
                    d.hasUnsavedChanges = false;
                });
            } catch (e) {
                set((d) => { d.isSaving = false; d.libraryError = errMsg(e); });
            }
        },
        updateSavedTest: async (id: string, name: string, description: string) => {
            set((d) => { d.isSaving = true; d.libraryError = null; });
            try {
                const state = get();
                assertUniqueName(state.savedTests, name, id);
                const effectiveName = name || getActiveTest(state).name || '';
                const def = { ...getActiveTest(state), name: effectiveName };
                const version = state.savedTestVersion ?? undefined;
                const updated = await savedTestsApi.updateTest(id, {
                    name: effectiveName, description, definition: def, version,
                });
                set((d) => {
                    const idx = d.savedTests.findIndex((t) => t.id === id);
                    if (idx !== -1) d.savedTests[idx] = updated;
                    d.isSaving = false; d.savedTestVersion = updated.version ?? null;
                    d.hasUnsavedChanges = false;
                });
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isConflict = e instanceof Error && 'status' in e && (e as any).status === 409;
                set((d) => {
                    d.isSaving = false;
                    d.libraryError = isConflict
                        ? 'This test was modified by someone else — please reload before saving.'
                        : errMsg(e);
                });
            }
        },
        deleteSavedTest: async (id: string) => {
            set((d) => { d.libraryError = null; });
            try {
                await savedTestsApi.deleteTest(id);
                set((d) => { d.savedTests = d.savedTests.filter((t) => t.id !== id); });
            } catch (e) { set((d) => { d.libraryError = errMsg(e); }); }
        },
        cloneSavedTest: async (id: string) => {
            const source = get().savedTests.find((t) => t.id === id);
            if (!source || !source.definition) {
                set((d) => { d.libraryError = 'Cannot clone — test not found.'; }); return;
            }
            set((d) => { d.isSaving = true; d.libraryError = null; });
            try {
                const cloneName = source.name + ' (Copy)';
                const def = { ...source.definition, name: cloneName };
                const saved = await savedTestsApi.saveTest({
                    name: cloneName, description: source.description || '', definition: def,
                });
                set((d) => { d.savedTests.unshift(saved); d.isSaving = false; });
            } catch (e) {
                set((d) => { d.isSaving = false; d.libraryError = errMsg(e); });
            }
        },
        clearLibraryError: () => { set((d) => { d.libraryError = null; }); },

        // --- Loader + SPL drift ---
        loadTestFromPayload: (full: SavedTestFull): void => {
            if (!full || !full.definition) return;
            set((d) => { applyTestToBuilder(d, full, full.id); });
        },
        loadTestIntoBuilder: (id: string): string => {
            const state = get();
            const full = state.savedTests.find((t) => t.id === id);
            if (!full || !full.definition) {
                set((d) => { d.libraryError = 'Test not found in library.'; });
                throw new Error('Test not found');
            }
            set((d) => { applyTestToBuilder(d, full, id); d.splDriftWarning = null; });
            // Fire-and-forget SPL drift check
            const origin = full.definition?.query?.savedSearchOrigin;
            const app = full.app || full.definition?.app;
            if (origin && app) {
                getSavedSearchSpl(app, origin)
                    .then((currentSpl) => {
                        if (currentSpl.trim() !== (full.definition.query?.spl ?? '').trim()) {
                            set((d) => {
                                d.splDriftWarning = 'The saved search "' + origin + '" has changed since this test was last saved.';
                            });
                        }
                    })
                    .catch(() => {
                        set((d) => {
                            d.splDriftWarning = 'The saved search "' + origin + '" could not be found. It may have been deleted or renamed.';
                        });
                    });
            }
            return full.name;
        },
        clearSplDriftWarning: () => { set((d) => { d.splDriftWarning = null; }); },
        reloadDriftedSpl: async () => {
            const state = get();
            const activeTest = state.tests.find((t) => t.id === state.activeTestId);
            const origin = activeTest?.query?.savedSearchOrigin;
            const app = activeTest?.app;
            if (!activeTest || !origin || !app) return;
            try {
                const currentSpl = await getSavedSearchSpl(app, origin);
                set((d) => {
                    const test = d.tests.find((t) => t.id === d.activeTestId);
                    if (test) test.query.spl = currentSpl;
                    d.splDriftWarning = null;
                });
            } catch {
                set((d) => { d.libraryError = 'Failed to reload SPL from saved search.'; });
            }
        },
    };
}
