/**
 * Single Zustand v4 store with Immer. Spec 9, 15.
 * Combines all slices; only create() call lives here.
 */

import create from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TestDefinition } from '../types';
import type { TestStoreState } from './storeTypes';
import { createDefaultTest } from '../constants/defaults';
import { testSlice } from './slices/testSlice';
import { scenarioSlice } from './slices/scenarioSlice';
import { inputSlice } from './slices/inputSlice';
import { querySlice } from './slices/querySlice';
import { validationSlice } from './slices/validationSlice';
import { generatorSlice } from './slices/generatorSlice';
import { runSlice } from './slices/runSlice';
import { fileSlice } from './slices/fileSlice';
import { scheduledTestsSlice, scheduledTestsInitialState } from './slices/scheduledTestsSlice';
import { testLibrarySlice, testLibraryInitialState } from './slices/testLibrarySlice';
import { configSlice, configInitialState, commandPolicyInitialState } from './slices/configSlice';
import { llmActionsSlice } from './slices/llmActionsSlice';
import { ideSlice, ideInitialState } from './slices/ideSlice';
import { chatSlice, chatInitialState } from './slices/chatSlice';
import { consumeSkip } from './changeDetectionFlag';

export type { TestStoreState } from './storeTypes';
export type { SavedState } from './slices/fileSlice';

const initialTest = createDefaultTest();

export const useTestStore = create<TestStoreState>()(
    immer((set, get) => ({
        tests: [initialTest],
        activeTestId: initialTest.id,
        isRunning: false,
        testResponse: null,
        resultsBarExpanded: false,
        savedTestId: null,
        savedTestVersion: null,
        hasUnsavedChanges: false,
        markUnsaved: () => set((draft) => { draft.hasUnsavedChanges = true; }),

        ...testSlice(set, get),
        ...scenarioSlice(set),
        ...inputSlice(set),
        ...querySlice(set),
        ...validationSlice(set),
        ...generatorSlice(set),
        ...runSlice(set, get),
        ...fileSlice(set, get),

        ...scheduledTestsInitialState,
        ...scheduledTestsSlice(set),

        ...testLibraryInitialState,
        ...testLibrarySlice(set, get),

        ...configInitialState,
        ...commandPolicyInitialState,
        ...configSlice(set),

        ...llmActionsSlice(set, get),

        ...ideInitialState,
        ...ideSlice(set, get),

        ...chatInitialState,
        ...chatSlice(set, get),

        setupRequired: false,
    }))
);

// Auto-detect unsaved changes: any mutation to `tests` marks unsaved.
// Actions that intentionally reset (addTest, resetToNewTest, loadTestIntoBuilder)
// call skipNextTestsChange() so the subscription ignores that single mutation.
let _prevTests: TestDefinition[] | null = null;
useTestStore.subscribe((state) => {
    if (state.tests !== _prevTests) {
        if (consumeSkip()) {
            // Intentional reset — don't mark unsaved
        } else if (_prevTests !== null && !state.hasUnsavedChanges) {
            state.markUnsaved();
        }
        _prevTests = state.tests;
    }
});
