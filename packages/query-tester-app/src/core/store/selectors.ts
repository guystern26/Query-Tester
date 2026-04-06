/**
 * Selectors for test store. Spec 17.6.
 *
 * Components should use granular selectors to avoid full-store re-renders:
 *   const isRunning = useTestStore(selectIsRunning);
 */

import type { EntityId, TestDefinition, Scenario, SavedTestFull, ScheduledTest } from '../types';
import type { TestStoreState } from './storeTypes';
import type { TestResponse, ResponseMessage, SplWarning } from '../types';
import type { AppConfig, CommandPolicyEntry } from '../types/config';

// --- Primitive state selectors ---

export const selectIsRunning = (s: TestStoreState): boolean => s.isRunning;
export const selectTestResponse = (s: TestStoreState): TestResponse | null => s.testResponse;
export const selectActiveTestId = (s: TestStoreState): EntityId | null => s.activeTestId;
export const selectTests = (s: TestStoreState): TestDefinition[] => s.tests;
export const selectTestCount = (s: TestStoreState): number => s.tests.length;
export const selectResultsBarExpanded = (s: TestStoreState): boolean => s.resultsBarExpanded;
export const selectSavedTestId = (s: TestStoreState): string | null => s.savedTestId;
export const selectSavedTestVersion = (s: TestStoreState): number | null => s.savedTestVersion;
export const selectHasUnsavedChanges = (s: TestStoreState): boolean => s.hasUnsavedChanges;
export const selectSplDriftWarning = (s: TestStoreState): string | null => s.splDriftWarning;
export const selectSavedTests = (s: TestStoreState): SavedTestFull[] => s.savedTests;
export const selectIsLoadingLibrary = (s: TestStoreState): boolean => s.isLoadingLibrary;
export const selectIsSaving = (s: TestStoreState): boolean => s.isSaving;
export const selectLibraryError = (s: TestStoreState): string | null => s.libraryError;
export const selectScheduledTests = (s: TestStoreState): ScheduledTest[] => s.scheduledTests;
export const selectIsLoadingScheduled = (s: TestStoreState): boolean => s.isLoadingScheduled;
export const selectScheduledError = (s: TestStoreState): string | null => s.scheduledError;
export const selectAppConfig = (s: TestStoreState): AppConfig | null => s.appConfig;
export const selectIsLoadingConfig = (s: TestStoreState): boolean => s.isLoadingConfig;
export const selectConfigError = (s: TestStoreState): string | null => s.configError;
export const selectIsAdmin = (s: TestStoreState): boolean => s.isAdmin;
export const selectSetupRequired = (s: TestStoreState): boolean => s.setupRequired;
export const selectCommandPolicy = (s: TestStoreState): CommandPolicyEntry[] => s.commandPolicy;
export const selectIsLoadingPolicy = (s: TestStoreState): boolean => s.isLoadingPolicy;

// --- Derived selectors ---

export function selectActiveTest(s: TestStoreState): TestDefinition | null {
    if (!s.activeTestId) return null;
    return s.tests.find((t) => t.id === s.activeTestId) ?? null;
}

export function selectActiveTestIndex(s: TestStoreState): number {
    if (!s.activeTestId) return -1;
    return s.tests.findIndex((t) => t.id === s.activeTestId);
}

export function selectErrors(s: TestStoreState): ResponseMessage[] {
    return s.testResponse?.errors ?? [];
}

export function selectWarnings(s: TestStoreState): SplWarning[] {
    return s.testResponse?.warnings ?? [];
}

export function selectHasResults(s: TestStoreState): boolean {
    return (s.testResponse?.scenarioResults?.length ?? 0) > 0;
}

export function selectScenario(s: TestStoreState, scenarioId: EntityId) {
    const test = selectActiveTest(s);
    return test?.scenarios.find((sc) => sc.id === scenarioId) ?? null;
}

export function selectInput(s: TestStoreState, scenarioId: EntityId, inputId: EntityId) {
    const scenario = selectScenario(s, scenarioId);
    return scenario?.inputs.find((i) => i.id === inputId) ?? null;
}

/** True when at least one input across all scenarios has meaningful data configured. */
export function inputHasData(scenarios: Scenario[]): boolean {
    return scenarios.some((s) =>
        s.inputs.some((i) =>
            (i.inputMode === 'query_data' && (i.queryDataConfig?.spl ?? '').trim() !== '')
            || i.inputMode === 'no_events'
            || (i.inputMode === 'json' && (i.jsonContent ?? '').trim() !== '')
            || i.events.some((e) => e.fieldValues.some((f) => f.field.trim() !== ''))
        )
    );
}

// --- Action selectors (group related actions for component use) ---

export const selectRunActions = (s: TestStoreState) => ({
    runTest: s.runTest,
    cancelTest: s.cancelTest,
    clearResults: s.clearResults,
    setTestResponse: s.setTestResponse,
    toggleResultsBar: s.toggleResultsBar,
    setResultsBarExpanded: s.setResultsBarExpanded,
});

export const selectLibraryActions = (s: TestStoreState) => ({
    fetchSavedTests: s.fetchSavedTests,
    saveCurrentTest: s.saveCurrentTest,
    updateSavedTest: s.updateSavedTest,
    deleteSavedTest: s.deleteSavedTest,
    cloneSavedTest: s.cloneSavedTest,
    loadTestIntoBuilder: s.loadTestIntoBuilder,
    loadTestFromPayload: s.loadTestFromPayload,
    clearLibraryError: s.clearLibraryError,
    clearSplDriftWarning: s.clearSplDriftWarning,
    reloadDriftedSpl: s.reloadDriftedSpl,
});

export const selectScheduleActions = (s: TestStoreState) => ({
    fetchScheduledTests: s.fetchScheduledTests,
    createScheduledTest: s.createScheduledTest,
    updateScheduledTest: s.updateScheduledTest,
    deleteScheduledTest: s.deleteScheduledTest,
    runNow: s.runNow,
    fetchRunHistory: s.fetchRunHistory,
    clearScheduledError: s.clearScheduledError,
});

export const selectConfigActions = (s: TestStoreState) => ({
    fetchAppConfig: s.fetchAppConfig,
    fetchConfigStatus: s.fetchConfigStatus,
    saveConfigSection: s.saveConfigSection,
    testConnection: s.testConnection,
    detectEmailConfig: s.detectEmailConfig,
    getSecret: s.getSecret,
    fetchCommandPolicy: s.fetchCommandPolicy,
    saveCommandPolicy: s.saveCommandPolicy,
    resetCommandPolicy: s.resetCommandPolicy,
    saveCommandPolicyEntry: s.saveCommandPolicyEntry,
    deleteCommandPolicyEntry: s.deleteCommandPolicyEntry,
});

export const selectFileActions = (s: TestStoreState) => ({
    saveToFile: s.saveToFile,
    loadFromFile: s.loadFromFile,
});
