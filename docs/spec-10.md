# Spec 10 — Directory Structure

## Frontend (`packages/query-tester-app/src/`)

```
src/
├── api/                              # API layer (7 files)
│   ├── configApi.ts                  # Admin config CRUD
│   ├── configApiMappers.ts           # snake_case <-> camelCase mapping
│   ├── llmApi.ts                     # LLM/AI calls
│   ├── savedTestsApi.ts              # Saved tests CRUD
│   ├── scheduledTestsApi.ts          # Scheduled tests + run history CRUD
│   ├── splunkApi.ts                  # Splunk REST (apps, saved searches)
│   └── testApi.ts                    # Manual test execution
│
├── common/                           # styled-components wrappers (12 files)
│   ├── Button.tsx, Card.tsx, EmptyState.tsx, Message.tsx
│   ├── Modal.tsx, SearchableSelect.tsx, Select.tsx
│   ├── Switch.tsx, Tabs.tsx, TextArea.tsx, ThemeProvider.tsx
│   └── index.ts
│
├── components/                       # Reusable UI components
│   ├── AppSelector.tsx               # App dropdown selector
│   ├── GearIcon.tsx                  # Gear/settings icon
│   ├── inputs/                       # Input display components
│   │   ├── FieldValueEditor.tsx      # Structured field-value editing
│   │   ├── JsonInputView.tsx         # Raw JSON input view
│   │   └── QueryDataView.tsx         # Query-data input view
│   └── test-navigation/             # Top bar components
│       ├── TopBar.tsx                # Main top navigation bar
│       ├── TestNavigation.tsx        # Test nav controls
│       ├── SaveTestModal.tsx         # Save to library modal
│       └── BugReportButton.tsx       # Bug report generator
│
├── config/
│   └── env.ts                        # Static config (REST_PATH, LLM fallbacks)
│
├── core/
│   ├── constants/                    # Named constants (4 files)
│   │   ├── commandPolicy.ts, defaults.ts, limits.ts, scheduledTests.ts
│   ├── store/
│   │   ├── testStore.ts              # Single create() combining 14 slices
│   │   ├── selectors.ts             # Derived state selectors
│   │   ├── changeDetectionFlag.ts   # Unsaved changes tracking
│   │   └── slices/                  # 14 slice files + types
│   │       ├── testSlice.ts, scenarioSlice.ts, inputSlice.ts
│   │       ├── querySlice.ts, validationSlice.ts, generatorSlice.ts
│   │       ├── runSlice.ts, fileSlice.ts
│   │       ├── testLibrarySlice.ts, scheduledTestsSlice.ts
│   │       ├── testLoaderSlice.ts, configSlice.ts, commandPolicySlice.ts
│   │       ├── helpers.ts
│   │       ├── configTypes.ts, testLibraryTypes.ts
│   │       └── __tests__/
│   └── types/                       # TypeScript interfaces (5 files)
│       ├── base.ts                  # Core data types (Test, Scenario, Input)
│       ├── config.ts                # Config types
│       ├── generator.ts             # Event generator types
│       ├── results.ts               # TestResponse, ScenarioResult, etc.
│       └── index.ts                 # Re-exports
│
├── features/                        # Feature modules (10 directories)
│   ├── eventGenerator/              # Event generation UI
│   │   ├── GeneratorPanel.tsx, GeneratorRule.tsx
│   │   ├── configs/                 # Per-type config UIs (8 files)
│   │   │   ├── EmailConfig, NumberedConfig, GeneralFieldConfig
│   │   │   ├── UniqueIdConfig, PickListConfig, RandomNumberConfig
│   │   │   ├── IpAddressConfig, OctetInput, VariantRow
│   │   └── utils/normalizeWeights.ts
│   ├── layout/                      # Layout components (5 files)
│   │   ├── SetupCard.tsx            # Initial setup card
│   │   ├── StepPipeline.tsx         # Progress pipeline
│   │   ├── PipelineConnector.tsx    # Pipeline visual connector
│   │   ├── usePipelineState.ts     # Pipeline state hook
│   │   └── UnsavedChangesModal.tsx
│   ├── library/                     # Library page (6 files)
│   │   ├── LibraryPage.tsx, LibraryFilters.tsx
│   │   ├── TestsTable.tsx, TestsTableRow.tsx
│   │   ├── useLibraryFilters.ts
│   │   └── index.ts
│   ├── query/                       # SPL editor (7 files)
│   │   ├── QuerySection.tsx         # Main query editor
│   │   ├── SplWarningOverlay.tsx    # Linter warning display
│   │   ├── TimeRangePicker.tsx
│   │   ├── splLinter.ts, splLinterRules.ts
│   │   ├── aceMarkerStyles.ts, useAceMarkers.ts
│   ├── results/                     # Results display (6 files)
│   │   ├── ResultsBar.tsx, ResultsPanel.tsx
│   │   ├── ScenarioResultCard.tsx, ValidationItem.tsx
│   │   ├── ResultRowsTable.tsx, resultHelpers.ts
│   ├── scenarios/                   # Scenario management (10 files)
│   │   ├── ScenarioPanel.tsx, ScenarioTabRow.tsx
│   │   ├── InputCard.tsx, FieldValueEditor.tsx
│   │   ├── DataSourceSelector.tsx, TestTypeSelector.tsx
│   │   ├── EventGeneratorToggle.tsx, ExtractFieldsButton.tsx
│   │   ├── inputIcons.tsx, scenarioColors.ts
│   ├── setup/                       # Admin setup page (17 files)
│   │   ├── SetupPage.tsx
│   │   ├── SetupSection.tsx, SetupField.tsx, SecretField.tsx
│   │   ├── SplunkSection.tsx, HecSection.tsx, EmailSection.tsx
│   │   ├── EmailAuthFields.tsx, LlmSection.tsx
│   │   ├── WebUrlSection.tsx, LoggingSection.tsx, TempIndexSection.tsx
│   │   ├── CommandPolicySection.tsx, PolicyRow.tsx
│   │   ├── TestConnectionBar.tsx
│   │   ├── useSetupPage.ts, useSectionFields.ts
│   ├── suites/                      # Scheduling dashboard (10 files)
│   │   ├── SuitesPage.tsx, SuitesPageStates.tsx
│   │   ├── ScheduledTestsTable.tsx, ScheduleModal.tsx
│   │   ├── CronPicker.tsx, RecipientsList.tsx
│   │   ├── RunHistoryDrawer.tsx, RunHistoryRow.tsx
│   │   └── index.ts
│   ├── tutorial/                    # Interactive tutorial (7 files)
│   │   ├── TutorialOverlay.tsx, TutorialSpotlight.tsx, TutorialTooltip.tsx
│   │   ├── TutorialLaunchButton.tsx
│   │   ├── tutorialSteps.ts, tutorialSeeder.ts, useTutorial.ts
│   └── validation/                  # Validation UI (13 files)
│       ├── ValidationSection.tsx, ValidationScope.tsx
│       ├── FieldConditionsGrid.tsx, FieldGroupCard.tsx, ConditionRow.tsx
│       ├── FieldNameSelector.tsx, ResultCountSection.tsx
│       ├── IjumpValidation.tsx, IjumpLockedCards.tsx, IjumpCustomConditions.tsx
│       ├── SuggestFieldsButton.tsx, conditionPreview.ts
│       └── utils/ (operatorConstants.ts, ijumpHelpers.ts)
│
├── hooks/                           # Custom hooks (3 files)
│   ├── useLoadTest.ts              # Load saved test by ID
│   ├── useLoadLastRun.ts           # Load last run result
│   └── useSavedSearches.ts         # Fetch saved searches for app
│
├── utils/                           # Utilities (5 files)
│   ├── formatters.ts               # Display formatting (formatMs, etc.)
│   ├── payloadBuilder.ts           # Build test execution payload
│   ├── preflight.ts                # Pre-run validation checks
│   ├── mockFixtures.ts             # Test fixtures
│   └── mockResults.ts              # Mock result data
│
├── AppShell.tsx                     # Hash-based router
├── StartPage.tsx                    # Main builder page
├── dev-entry.tsx                    # Vite dev server entry
├── index.ts                         # Library exports
├── globals.css                      # Tailwind 3 + custom properties
└── animations.css                   # CSS animations
```
