# Selector Migration Report

## Problem

43 components call `useTestStore()` without a selector, subscribing to the
entire store. Every state change (any of 14 slices) triggers a re-render in
every one of these components — including on every SPL editor keystroke.

## Fix

Replace bare `useTestStore()` with granular selectors from `selectors.ts`:

```ts
// BEFORE — re-renders on every store change
const state = useTestStore();
const isRunning = state.isRunning;

// AFTER — re-renders only when isRunning changes
const isRunning = useTestStore(selectIsRunning);
```

For actions, use action selectors to group related functions:
```ts
const { runTest, cancelTest } = useTestStore(selectRunActions);
```

## Available Selectors (core/store/selectors.ts)

### State selectors
- `selectIsRunning`, `selectTestResponse`, `selectActiveTestId`, `selectTests`
- `selectResultsBarExpanded`, `selectSavedTestId`, `selectHasUnsavedChanges`
- `selectSplDriftWarning`, `selectSavedTests`, `selectScheduledTests`
- `selectAppConfig`, `selectIsAdmin`, `selectSetupRequired`
- `selectIsLoadingLibrary`, `selectIsSaving`, `selectLibraryError`
- `selectIsLoadingScheduled`, `selectScheduledError`
- `selectIsLoadingConfig`, `selectConfigError`, `selectCommandPolicy`
- `selectSavedTestVersion`, `selectIsLoadingPolicy`, `selectTestCount`

### Derived selectors
- `selectActiveTest`, `selectActiveTestIndex`
- `selectErrors`, `selectWarnings`, `selectHasResults`
- `selectScenario(s, id)`, `selectInput(s, scenarioId, inputId)`

### Action selectors
- `selectRunActions` — runTest, cancelTest, clearResults, etc.
- `selectLibraryActions` — fetchSavedTests, saveCurrentTest, etc.
- `selectScheduleActions` — fetchScheduledTests, createScheduledTest, etc.
- `selectConfigActions` — fetchAppConfig, saveConfigSection, etc.
- `selectFileActions` — saveToFile, loadFromFile

## Components to Migrate (43 files)

### Core Pages
- `src/StartPage.tsx` — uses: resultsBarExpanded, updateTestName, updateApp
- `src/features/library/LibraryPage.tsx` — uses: savedTests, scheduledTests, isLoadingLibrary, many actions

### Hooks
- `src/hooks/useLoadTest.ts` — uses: loadTestIntoBuilder, savedTests, fetchSavedTests
- `src/features/layout/usePipelineState.ts` — uses: state for pipeline logic

### Navigation
- `src/components/test-navigation/TopBar.tsx`
- `src/components/test-navigation/TestNavigation.tsx`
- `src/components/test-navigation/BugReportButton.tsx`

### Query & Results
- `src/features/query/QuerySection.tsx` — SPL editor, time range, saved search
- `src/features/results/ResultsPanel.tsx`
- `src/features/results/ResultsBar.tsx`

### Scenarios & Data Input
- `src/features/scenarios/ScenarioPanel.tsx`
- `src/features/scenarios/InputCard.tsx`
- `src/features/scenarios/TestTypeSelector.tsx`
- `src/features/scenarios/FieldValueEditor.tsx`
- `src/features/scenarios/DataSourceSelector.tsx`
- `src/features/scenarios/EventGeneratorToggle.tsx`
- `src/features/scenarios/ExtractFieldsButton.tsx`

### Input Editors
- `src/components/inputs/FieldValueEditor.tsx`
- `src/components/inputs/JsonInputView.tsx`
- `src/components/inputs/QueryDataView.tsx`

### Validation
- `src/features/validation/ValidationSection.tsx`
- `src/features/validation/FieldGroupCard.tsx`
- `src/features/validation/FieldConditionsGrid.tsx`
- `src/features/validation/ConditionRow.tsx`
- `src/features/validation/FieldNameSelector.tsx`
- `src/features/validation/ResultCountSection.tsx`
- `src/features/validation/ValidationScope.tsx`
- `src/features/validation/IjumpValidation.tsx`
- `src/features/validation/IjumpCustomConditions.tsx`
- `src/features/validation/IjumpLockedCards.tsx`
- `src/features/validation/SuggestFieldsButton.tsx`

### Event Generator
- `src/features/eventGenerator/GeneratorPanel.tsx`
- `src/features/eventGenerator/GeneratorRule.tsx`
- `src/features/eventGenerator/configs/NumberedConfig.tsx`
- `src/features/eventGenerator/configs/PickListConfig.tsx`
- `src/features/eventGenerator/configs/EmailConfig.tsx`
- `src/features/eventGenerator/configs/IpAddressConfig.tsx`
- `src/features/eventGenerator/configs/RandomNumberConfig.tsx`
- `src/features/eventGenerator/configs/UniqueIdConfig.tsx`
- `src/features/eventGenerator/configs/GeneralFieldConfig.tsx`

### Scheduled Tests
- `src/features/suites/SuitesPage.tsx`
- `src/features/suites/ScheduleModal.tsx`
- `src/features/suites/RunHistoryDrawer.tsx`

## Imperative getState() calls (6 files — OK to keep)

These use `useTestStore.getState()` outside React render, which is correct:
- `src/AppShell.tsx` — navigation guards, init
- `src/api/llmApi.ts` — reads appConfig for LLM endpoint
- `src/hooks/useLoadTest.ts` — pre-check before fetch
- `src/features/tutorial/tutorialSeeder.ts` — seeds data
