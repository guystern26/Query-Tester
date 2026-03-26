/**
 * TestStoreState interface — the public shape of the Zustand store.
 * Extracted from testStore.ts to keep both files under 200 lines.
 */
import type {
    EntityId, TestDefinition, TestResponse, TimeRange, InputMode,
    ValidationType, ValidationScope, ResultCountOperator,
    FieldConditionGroup, SingleCondition, FieldGenerationRule,
    ExtractedDataSource, TestType, ScheduledTest, TestRunRecord, SavedTestFull,
} from '../types';
import type {
    AppConfig, CommandPolicyEntry, ConfigStatus, ConnectionTestResult, EmailDetectResult,
} from '../types/config';

export interface TestStoreState {
    tests: TestDefinition[];
    activeTestId: EntityId | null;
    isRunning: boolean;
    testResponse: TestResponse | null;
    resultsBarExpanded: boolean;
    savedTestId: string | null;
    savedTestVersion: number | null;
    hasUnsavedChanges: boolean;
    markUnsaved: () => void;

    // --- Test CRUD ---
    addTest: () => void;
    resetToNewTest: () => void;
    deleteTest: (testId: EntityId) => void;
    duplicateTest: (testId: EntityId) => void;
    updateTestName: (testId: EntityId, name: string) => void;
    setActiveTest: (testId: EntityId | null) => void;
    updateTestType: (testId: EntityId, testType: TestType) => void;
    updateApp: (testId: EntityId, app: string) => void;

    // --- Scenarios ---
    addScenario: (testId: EntityId) => void;
    deleteScenario: (testId: EntityId, scenarioId: EntityId) => void;
    updateScenarioName: (testId: EntityId, scenarioId: EntityId, name: string) => void;
    updateScenarioDescription: (testId: EntityId, scenarioId: EntityId, description: string) => void;

    // --- Inputs ---
    addInput: (testId: EntityId, scenarioId: EntityId) => void;
    deleteInput: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
    setInputMode: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, mode: InputMode) => void;
    updateRowIdentifier: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, rowIdentifier: string) => void;
    updateInputJson: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, jsonContent: string) => void;
    setInputFileRef: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, fileRef: { name: string; size: number } | null) => void;
    addEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
    deleteEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventId: EntityId) => void;
    addFieldToAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
    removeFieldFromAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, fieldIndex: number) => void;
    updateFieldValue: (
        testId: EntityId, scenarioId: EntityId, inputId: EntityId,
        eventId: EntityId, fieldValueId: EntityId, patch: { field?: string; value?: string }
    ) => void;
    updateFieldNameInAllEvents: (
        testId: EntityId, scenarioId: EntityId, inputId: EntityId,
        fieldIndex: number, newName: string
    ) => void;

    // --- Query ---
    updateSpl: (testId: EntityId, spl: string) => void;
    loadSavedSearchSpl: (testId: EntityId, spl: string, savedSearchOrigin: string | null) => void;
    setTimeRange: (testId: EntityId, timeRange: TimeRange) => void;

    // --- Validation ---
    addFieldGroup: (testId: EntityId, initial?: Partial<FieldConditionGroup>) => void;
    removeFieldGroup: (testId: EntityId, groupId: EntityId) => void;
    duplicateFieldGroup: (testId: EntityId, groupId: EntityId) => void;
    updateFieldGroupField: (testId: EntityId, groupId: EntityId, field: string) => void;
    updateFieldGroupLogic: (testId: EntityId, groupId: EntityId, logic: 'and' | 'or') => void;
    updateFieldGroupScope: (testId: EntityId, groupId: EntityId, scope: 'all' | EntityId[]) => void;
    addConditionToGroup: (testId: EntityId, groupId: EntityId, initial?: Partial<SingleCondition>) => void;
    removeConditionFromGroup: (testId: EntityId, groupId: EntityId, conditionId: EntityId) => void;
    updateConditionInGroup: (testId: EntityId, groupId: EntityId, conditionId: EntityId, patch: Partial<Pick<SingleCondition, 'operator' | 'value'>>) => void;
    updateFieldLogic: (testId: EntityId, logic: 'and' | 'or') => void;
    updateValidationScope: (testId: EntityId, scope: ValidationScope, scopeN?: number | null) => void;
    replaceAllFieldGroups: (testId: EntityId, groups: FieldConditionGroup[]) => void;
    setValidationType: (testId: EntityId, validationType: ValidationType) => void;
    updateResultCount: (testId: EntityId, patch: Partial<{ enabled: boolean; operator: ResultCountOperator; value: number }>) => void;

    // --- Generator ---
    setGeneratorEnabled: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, enabled: boolean) => void;
    updateGeneratorEventCount: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventCount: number) => void;
    addGeneratorRule: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, rule: Omit<FieldGenerationRule, 'id'>) => void;
    deleteGeneratorRule: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, ruleId: EntityId) => void;
    updateGeneratorRule: (
        testId: EntityId, scenarioId: EntityId, inputId: EntityId, ruleId: EntityId,
        patch: Partial<Pick<FieldGenerationRule, 'field' | 'type' | 'config'>>
    ) => void;

    // --- Run ---
    runTest: () => Promise<void>;
    cancelTest: () => void;
    setTestResponse: (response: TestResponse | null) => void;
    clearResults: () => void;
    toggleResultsBar: () => void;
    setResultsBarExpanded: (expanded: boolean) => void;

    // --- File ---
    saveToFile: () => void;
    loadFromFile: (content: string) => { success: boolean; error?: string };

    // --- Scheduled Tests ---
    scheduledTests: ScheduledTest[];
    runHistory: Record<string, TestRunRecord[]>;
    isLoadingScheduled: boolean;
    isLoadingHistory: boolean;
    togglingScheduleId: string | null;
    creatingScheduleForTestId: string | null;
    scheduledError: string | null;
    fetchScheduledTests: () => Promise<void>;
    createScheduledTest: (payload: Omit<ScheduledTest, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus'>) => Promise<void>;
    updateScheduledTest: (id: string, patch: Partial<ScheduledTest>) => Promise<void>;
    deleteScheduledTest: (id: string) => Promise<void>;
    runNow: (id: string) => Promise<void>;
    fetchRunHistory: (scheduledTestId: string) => Promise<void>;
    clearScheduledError: () => void;

    // --- Test Library ---
    savedTests: SavedTestFull[];
    isLoadingLibrary: boolean;
    isSaving: boolean;
    libraryError: string | null;
    splDriftWarning: string | null;
    fetchSavedTests: () => Promise<void>;
    loadTestFromPayload: (full: SavedTestFull) => void;
    loadTestIntoBuilder: (id: string) => string;
    saveCurrentTest: (name: string, description: string) => Promise<void>;
    updateSavedTest: (id: string, name: string, description: string) => Promise<void>;
    deleteSavedTest: (id: string) => Promise<void>;
    cloneSavedTest: (id: string) => Promise<void>;
    clearLibraryError: () => void;
    clearSplDriftWarning: () => void;
    reloadDriftedSpl: () => Promise<void>;

    // --- Config ---
    appConfig: AppConfig | null;
    configStatus: ConfigStatus | null;
    isLoadingConfig: boolean;
    configError: string | null;
    isAdmin: boolean;
    fetchAppConfig: () => Promise<void>;
    fetchConfigStatus: () => Promise<void>;
    saveConfigSection: (plain: Partial<AppConfig>, secrets?: Record<string, string>) => Promise<void>;
    testConnection: () => Promise<ConnectionTestResult>;
    detectEmailConfig: () => Promise<EmailDetectResult>;
    getSecret: (name: string) => Promise<string>;

    // --- Command Policy ---
    commandPolicy: CommandPolicyEntry[];
    isLoadingPolicy: boolean;
    policyError: string | null;
    fetchCommandPolicy: () => Promise<void>;
    saveCommandPolicy: (entries: CommandPolicyEntry[]) => Promise<void>;
    resetCommandPolicy: () => Promise<void>;
    saveCommandPolicyEntry: (entry: CommandPolicyEntry) => Promise<void>;
    deleteCommandPolicyEntry: (command: string) => Promise<void>;

    // --- Setup & AI ---
    setupRequired: boolean;
    setFieldExtraction: (testId: EntityId, sources: ExtractedDataSource[]) => void;
    selectDataSource: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, source: ExtractedDataSource) => void;
    applySuggestedValidationFields: (testId: EntityId, fields: string[]) => void;
    fetchSavedSearchSpl: (testId: EntityId, app: string, savedSearchName: string) => Promise<void>;
    fetchQueryDataSavedSearchSpl: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, app: string, savedSearchName: string) => Promise<void>;
    fetchExtractDataSources: (testId: EntityId, scenarioId: EntityId, spl: string) => Promise<ExtractedDataSource[]>;
    fetchSuggestValidationFields: (testId: EntityId, spl: string) => Promise<{ fields: string[]; newCount: number }>;

    // --- Query Data ---
    updateQueryDataSpl: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, spl: string) => void;
    updateQueryDataTimeRange: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, timeRange: TimeRange) => void;
    updateQueryDataSavedSearch: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, name: string | null) => void;
}
