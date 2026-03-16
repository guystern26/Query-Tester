/**
 * Shared types and helpers for the test library slices.
 */

import type { EntityId, TestDefinition, TestResponse, SavedTestFull } from '../../types';
import { DEFAULT_TIME_RANGE } from '../../constants/defaults';

export interface TestLibraryState {
    savedTests: SavedTestFull[];
    isLoadingLibrary: boolean;
    isSaving: boolean;
    libraryError: string | null;
    splDriftWarning: string | null;
}

export type LibraryStoreState = {
    tests: TestDefinition[];
    activeTestId: EntityId | null;
    testResponse: TestResponse | null;
    savedTestId: string | null;
    savedTestVersion: number | null;
    hasUnsavedChanges: boolean;
} & TestLibraryState;

export type SetState = (recipe: (draft: LibraryStoreState) => void) => void;
export type GetState = () => LibraryStoreState;

export function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/** Prepare a definition for loading into the builder, backfilling missing fields. */
export function prepareDefinition(full: SavedTestFull): TestDefinition {
    const def = { ...full.definition };
    if (!def.name && full.name) def.name = full.name;
    if (def.query && !def.query.timeRange) {
        def.query.timeRange = { ...DEFAULT_TIME_RANGE };
    }
    return def;
}

/** Check for duplicate test name. Throws if found. */
export function assertUniqueName(
    savedTests: SavedTestFull[], name: string, excludeId?: string,
): void {
    const dup = savedTests.find(
        (t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId
    );
    if (dup) {
        throw new Error('A test named "' + name + '" already exists. Choose a different name.');
    }
}

/** Get the active test definition or throw. */
export function getActiveTest(state: LibraryStoreState): TestDefinition {
    const test = state.tests.find((t) => t.id === state.activeTestId);
    if (!test) throw new Error('No active test to save.');
    return test;
}

/** Load a saved test definition into the builder draft. */
export function applyTestToBuilder(
    draft: LibraryStoreState, full: SavedTestFull, savedId: string,
): void {
    const def = prepareDefinition(full);
    draft.tests = [def];
    draft.activeTestId = def.id;
    draft.testResponse = null;
    draft.savedTestId = savedId;
    draft.savedTestVersion = full.version ?? null;
    draft.hasUnsavedChanges = false;
}

export const testLibraryInitialState: TestLibraryState = {
    savedTests: [],
    isLoadingLibrary: false,
    isSaving: false,
    libraryError: null,
    splDriftWarning: null,
};
