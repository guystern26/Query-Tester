# Cursor / Claude Code Implementation Guide — Splunk Query Tester
## Updated: No @splunk packages available locally

---

## Strategy

The @splunk/react-ui and @splunk/themes packages are private — only available on the closed Splunk network. For local development, we build wrapper components in common/ using styled-components that mimic the Splunk UI API. When deploying to the closed network, swap imports to real @splunk packages.

The spec is split into small files — attach only the relevant ones per prompt. This saves context and speeds up responses.

Use **Sonnet** (not Opus) for all code generation prompts. Faster, same quality for this type of work.

---

## Setup (already done)

Your project root should have:
- .cursorrules
- package.json (without @splunk packages)
- tsconfig.json
- vite.config.ts
- index.html
- docs/ folder with split spec files
- packages/playground/src/main/webapp/ folder structure

---

## Phase 1: Types + Defaults + Limits

Attach: `docs/spec-02-react16.md`, `docs/spec-03-decisions.md`, `docs/spec-04-data-model.md`

Prompt:
```
Read the attached spec sections.

Create 3 files:

1. packages/playground/src/main/webapp/core/types/index.ts

All TypeScript interfaces and enums for the app:

Enums/types:
- TestType = 'standard' | 'query_only'
- InputMode = 'fields' | 'json' | 'no_events'
- ValidationType = 'standard' | 'ijump_alert'
- ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'is_empty' | 'is_not_empty' | 'in_list' | 'not_in_list' | 'is_timestamp'
- ResultCountOperator = 'equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
- ValidationScope = 'all_events' | 'any_event' | 'exactly_n' | 'at_least_n' | 'at_most_n'
- GenerationType = 'numbered' | 'pick_list' | 'random_number' | 'unique_id' | 'email' | 'ip_address' | 'general_field'
- ScenarioScope = 'all' | string (scenario ID)

Interfaces (exact fields matter):
- TestDefinition { id: string, name: string, app: string, testType: TestType, queryConfig: QueryConfig, scenarios: Scenario[], validationConfig: ValidationConfig }
- QueryConfig { spl: string, savedSearchOrigin: string | null }
- Scenario { id: string, name: string, description: string, inputs: TestInput[] }
- TestInput { id: string, inputMode: InputMode, rowIdentifier: string, jsonContent: string, fileRef: { name: string, size: number, lastModified: number } | null, generatorConfig: GeneratorConfig, events: InputEvent[] }
- InputEvent { id: string, fieldValues: FieldValue[] }
- FieldValue { id: string, field: string, value: string }
- GeneratorConfig { enabled: boolean, eventCount: number, rules: FieldGenerationRule[] }
- FieldGenerationRule { id: string, fieldName: string, generationType: GenerationType | null, config: GeneratorTypeConfig }
- GeneratorTypeConfig (union type for each generator)
- ValidationConfig { validationType: ValidationType, testMode: 'field_conditions', fieldConditions: FieldCondition[], resultCount: ResultCount, validationScope: ValidationScope, scopeN: number | null }
- FieldCondition { id: string, field: string, operator: ConditionOperator, value: string, scenarioScope: ScenarioScope }
- ResultCount { enabled: boolean, operator: ResultCountOperator, value: number }
- TestResponse { status: 'success' | 'partial' | 'error', message: string, errors: ResponseMessage[], warnings: ResponseMessage[], scenarioResults: ScenarioResult[], summary: TestSummary | null, queryInfo: QueryInfo | null }
- ScenarioResult { scenarioId: string, scenarioName: string, status: 'pass' | 'fail' | 'error', inputResults: InputResult[], errors: ResponseMessage[], warnings: ResponseMessage[] }
- InputResult { inputId: string, rowIdentifier: string, eventResults: EventValidationResult[] }
- EventValidationResult { eventIndex: number, passed: boolean, fieldResults: FieldValidationResult[] }
- FieldValidationResult { field: string, passed: boolean, operator: string, expected: string, actual: string, message: string }
- ResponseMessage { code: string, message: string, severity: 'fatal' | 'error' | 'warning' | 'caution' | 'info', source?: string, line?: number, tip?: string }
- TestSummary { totalScenarios: number, passed: number, failed: number, errors: number }
- QueryInfo { originalQuery: string, modifiedQuery: string, executionTimeMs: number }
- SavedSearch { name: string, search: string }
- BugReportPayload { reportGeneratedAt: string, reportType: 'bug' | 'feature', description: string, currentTest: TestDefinition, allTests?: TestDefinition[], testResponse?: TestResponse | null }

IDs use crypto.randomUUID(). All string fields default to ''. All arrays default to [].

2. packages/playground/src/main/webapp/core/constants/defaults.ts

Factory functions — all return EMPTY values, no pre-filled names:
- genId(): string — returns crypto.randomUUID()
- createDefaultTest(): TestDefinition
- createDefaultScenario(): Scenario
- createDefaultInput(): TestInput (with one default empty event)
- createDefaultEvent(previousEvent?: InputEvent): InputEvent — if previousEvent provided, copy field names with empty values
- createDefaultFieldCondition(): FieldCondition
- createDefaultGeneratorRule(): FieldGenerationRule

3. packages/playground/src/main/webapp/core/constants/limits.ts

Export constants:
MAX_TESTS = 20
MAX_SCENARIOS = 10
MAX_INPUTS = 10
MAX_EVENTS = 50
MAX_FIELDS = 30
MAX_CONDITIONS = 30
MAX_GENERATOR_EVENTS = 10000
QUERY_TIMEOUT_MS = 120000
DEBOUNCE_MS = 300
```

---

## Phase 2: Zustand Store

Attach: `docs/spec-09-state.md`

Prompt:
```
Read the attached spec section on state management.

Create 2 files:

1. packages/playground/src/main/webapp/core/store/testStore.ts

Single Zustand v4 store with Immer middleware. Use this exact import:
  import create from 'zustand';
  import { immer } from 'zustand/middleware/immer';

NOT: import { create } from 'zustand'  <-- this is v5, DO NOT USE

State shape:
  tests: TestDefinition[]
  activeTestId: string
  isRunning: boolean
  testResponse: TestResponse | null

Actions (all mutate via Immer draft syntax):

Test CRUD:
  addTest() — creates default test, sets as active
  deleteTest(testId) — removes test, switches to previous. Blocked if only 1 test.
  duplicateTest(testId) — deep clone with new IDs and " (Copy)" suffix
  updateTestName(testId, name)
  setActiveTest(testId)
  updateTestType(testId, testType)
  updateApp(testId, app)

Scenario:
  addScenario(testId)
  deleteScenario(testId, scenarioId)
  updateScenarioName(testId, scenarioId, name)
  updateScenarioDescription(testId, scenarioId, description)

Input:
  addInput(testId, scenarioId)
  deleteInput(testId, scenarioId, inputId)
  updateInputMode(testId, scenarioId, inputId, mode)
  updateRowIdentifier(testId, scenarioId, inputId, value)
  updateJsonContent(testId, scenarioId, inputId, value)

Event:
  addEvent(testId, scenarioId, inputId) — IMPORTANT: inherit field names from previous event
  deleteEvent(testId, scenarioId, inputId, eventId)

Field:
  addFieldToAllEvents(testId, scenarioId, inputId) — adds empty field to EVERY event
  removeFieldFromAllEvents(testId, scenarioId, inputId, fieldIndex) — removes by index from all
  updateFieldValue(testId, scenarioId, inputId, eventId, fieldId, key: 'field'|'value', value)

Query:
  updateSpl(testId, spl)
  loadSavedSearchSpl(testId, name, spl) — sets spl and savedSearchOrigin

Validation:
  setValidationType(testId, type)
  addFieldCondition(testId)
  removeFieldCondition(testId, conditionId)
  updateFieldCondition(testId, conditionId, updates: Partial<FieldCondition>)
  updateResultCount(testId, field: keyof ResultCount, value)
  updateValidationScope(testId, scope, scopeN?)

Generator:
  toggleGenerator(testId, scenarioId, inputId)
  updateGeneratorEventCount(testId, scenarioId, inputId, count)
  addGeneratorRule(testId, scenarioId, inputId)
  deleteGeneratorRule(testId, scenarioId, inputId, ruleId)
  updateGeneratorRule(testId, scenarioId, inputId, ruleId, updates)

Run:
  runTest(payload) — async, uses AbortController, 120s timeout
  cancelTest() — aborts the controller
  clearResults()

File:
  saveToFile() — serializes {version, savedAt, activeTestId, tests} to JSON, triggers download
  loadFromFile(jsonString) — validates version, replaces state

Helper (not exported as action):
  getActiveTest() — returns tests.find(t => t.id === activeTestId)

2. packages/playground/src/main/webapp/core/store/selectors.ts

Selector functions:
  selectActiveTest(state) — returns active test
  selectScenario(scenarioId)(state) — returns specific scenario from active test
  selectInput(scenarioId, inputId)(state)
  selectIsRunning(state)
  selectTestResponse(state)
  selectErrors(state) — testResponse?.errors
  selectWarnings(state) — testResponse?.warnings
  selectHasResults(state) — testResponse !== null
```

---

## Phase 3: Theme + Common Components (NO @splunk packages)

Attach: `docs/spec-07-ux.md`, `docs/spec-11-styling.md`

Prompt:
```
We are building for Splunk but the @splunk/react-ui and @splunk/themes packages are NOT available in this environment. Create wrapper components using styled-components that we can later swap for real Splunk components.

Create these files:

1. packages/playground/src/main/webapp/pages/start/tokens.css

CSS custom properties for dark mode theme:
  --bg-primary: #1a1a2e
  --bg-secondary: #16213e
  --bg-card: #1e2a45
  --bg-input: #0f3460
  --bg-hover: #243555
  --text-primary: #e8e8e8
  --text-secondary: #a0a0b0
  --text-muted: #6b7280
  --accent: #b3d9ff
  --accent-hover: #cce6ff
  --success: #4ade80
  --error: #ef4444
  --warning: #f59e0b
  --border: #2a2a4a
  --border-light: #374151
  --radius-sm: 4px
  --radius-md: 8px
  --radius-lg: 12px

2. packages/playground/src/main/webapp/pages/start/animations.css

@keyframes fadeIn, slideDown, pulse

3. packages/playground/src/main/webapp/common/ThemeProvider.tsx

A wrapper component that:
- Applies tokens.css variables to the document
- Wraps children in a styled div with --bg-primary background and --text-primary color
- Later this will be replaced with SplunkThemeProvider
- Export as default

4. packages/playground/src/main/webapp/common/Button.tsx — styled-components Button with variants: primary (sky accent), secondary (gray), danger (red). Props: variant, size, disabled, onClick, children.

5. packages/playground/src/main/webapp/common/Card.tsx — dark card with --bg-card background, --border border, --radius-md radius, padding.

6. packages/playground/src/main/webapp/common/Modal.tsx — overlay modal with title, children, onClose, confirmLabel, onConfirm, variant ('default'|'danger'). Dark themed.

7. packages/playground/src/main/webapp/common/Select.tsx — styled select dropdown. Dark themed.

8. packages/playground/src/main/webapp/common/TextArea.tsx — styled textarea with dark theme.

9. packages/playground/src/main/webapp/common/Switch.tsx — toggle switch component.

10. packages/playground/src/main/webapp/common/Message.tsx — inline banner with type: 'info' | 'warning' | 'error' | 'success'. Dismissible prop. Auto-hide timeout prop.

11. packages/playground/src/main/webapp/common/Tabs.tsx — tab bar component. Props: tabs (id, label)[], activeId, onChange.

12. packages/playground/src/main/webapp/common/index.ts — barrel export all components.

All components use styled-components. Dark theme from CSS variables. No @splunk imports. No Tailwind.
Each component should have a comment: // TODO: Replace with @splunk/react-ui/<Component> on closed network
```

---

## Phase 4: App Shell + Top Bar

Attach: `docs/spec-07-ux.md`, `docs/spec-15-topbar.md`

Prompt:
```
Read the attached spec sections on UX flow and top bar.

Create:

1. packages/playground/src/main/webapp/pages/start/index.tsx

Entry point. React 16 style:
  import ReactDOM from 'react-dom';
  ReactDOM.render(<ThemeProvider><StartPage /></ThemeProvider>, document.getElementById('root'));
  
NOT createRoot. Import ThemeProvider from common/.

2. packages/playground/src/main/webapp/pages/start/StartPage.tsx

Main layout with:
- TopBar (sticky top)
- TestTypeSelector (standard | query_only cards with warning notes on switch)
- AppChooser (text input for app name — will become dropdown on closed network)
- QuerySection (revealed after app is filled)
- DataSection (revealed after query entered, hidden if query_only)
- ValidationSection (revealed after data configured)
- RunButton area (revealed when required sections are filled)
- ResultsPanel (revealed after run)

Progressive reveal: each section checks previous section state from useTestStore.

3. packages/playground/src/main/webapp/components/test-navigation/TopBar.tsx

Sticky bar with:
- Left: SaveButton, LoadButton, BugReportButton
- Right: TestNavigation (prev/next arrows, editable name, counter, new/dup/delete)

SaveButton: calls store.saveToFile()
LoadButton: hidden <input type="file" accept=".json">, calls store.loadFromFile()

4. packages/playground/src/main/webapp/components/test-navigation/TestNavigation.tsx

Reads from useTestStore(). Prev/Next arrows, inline editable test name, "(1 of 3)" counter, New/Duplicate/Delete buttons. Delete shows confirmation modal when more than 1 test.

5. packages/playground/src/main/webapp/components/test-navigation/BugReportButton.tsx

Button opens modal with:
- Toggle: Bug Report | Feature Request
- TextArea for description
- Send button: (1) downloads JSON with BugReportPayload, (2) opens mailto: with subject and body
- Works fully offline

6. packages/playground/src/main/webapp/features/scenarios/TestTypeSelector.tsx

Two clickable cards side by side. On switch, show Message component:
- Standard: "Your query runs against generated test data. Only unspecified fields use real Splunk data."
- Query Only: "Your query runs directly against real Splunk data. No synthetic data injected."

All components use common/ wrappers. useTestStore() for state. No prop drilling.
```

---

## Phase 5: Query Section

Attach: `docs/spec-18-api.md`

Prompt:
```
Create the query section. Note: no @splunk packages available, so the SPL editor is a plain TextArea for now (TODO comment to replace with Splunk native component).

1. packages/playground/src/main/webapp/features/query/QuerySection.tsx

Contains:
- SPL editor (TextArea from common/, monospace font, dark theme)
- SavedSearchPicker (Select dropdown, populated from useSavedSearches hook)
- When saved search picked: calls splunkApi.getSavedSearchSpl(app, name), then store.loadSavedSearchSpl()
- App change warning: if app changes and savedSearchOrigin was set, show Message: "You changed the app. The saved search may not exist in the new app."
- Dismissible banner on any app change: "Some lookups, saved searches, and macros may not be available in the new app." Auto-hide 10s.

2. packages/playground/src/main/webapp/hooks/useSavedSearches.ts

Hook that takes app string. Returns { savedSearches, loading, error, refetch }.
Uses useState + useEffect + useCallback. Auto-fetches when app changes.
Calls splunkApi.getSavedSearches(app).

3. packages/playground/src/main/webapp/api/splunkApi.ts

API functions (all async, return typed results):
- getApps(): Promise<string[]> — GET /splunkd/__raw/services/apps/local
- getSavedSearches(app): Promise<SavedSearch[]> — GET /splunkd/__raw/services/saved/searches
- getSavedSearchSpl(app, name): Promise<string> — fetches SPL text

For local dev, add mock implementations that return dummy data:
- getApps: returns ['search', 'my_app', 'security_app']
- getSavedSearches: returns 3 fake saved searches
- getSavedSearchSpl: returns a sample SPL string

Add TODO comments to remove mocks when on closed network.

4. packages/playground/src/main/webapp/api/testApi.ts

- runTest(payload, signal: AbortSignal): Promise<TestResponse>
  POST /splunkd/__raw/services/query_tester/run
  Uses signal for cancellation
- For local dev: mock that returns a fake TestResponse after 2 second delay
```

---

## Phase 6: Scenarios + Inputs

Attach: `docs/spec-04-data-model.md`, `docs/spec-19-ux-polish.md`

Prompt:
```
Read the attached spec sections.

Create:

1. packages/playground/src/main/webapp/features/scenarios/ScenarioPanel.tsx

Tab-based scenario navigation:
- Tabs component from common/
- Each tab: scenario name (click to select)
- "+" tab to add scenario
- Right-click or X button on tab to delete (confirmation if non-empty)
- Below tabs: description TextArea with placeholder "Describe what this scenario tests..."
- Below description: list of InputCards for the selected scenario
- "Add Input" button at bottom (disabled at MAX_INPUTS)

2. packages/playground/src/main/webapp/features/scenarios/InputCard.tsx

Each input card contains:
- InputMode toggle: three buttons (Fields | JSON | No Events)
- Show Message on mode change:
  - JSON: "Paste raw JSON. Each top-level object becomes one event."
  - Fields: "Fill field names and values manually. Each row is an event."
  - No Events: "Returns 0 events. Tests what happens when a data source is empty."
- Row identifier TextInput, placeholder: "e.g., index=main sourcetype=access_combined"
- Content area: renders FieldValueEditor (fields mode), JsonInputView (json mode), or empty message (no_events)
- Delete input button (no confirmation needed)

3. packages/playground/src/main/webapp/components/inputs/FieldValueEditor.tsx

Events displayed as a table/grid:
- Columns = events, Rows = fields
- Header row: "Event 1", "Event 2", etc.
- Each cell: text input for field value
- Left column: field names (shared across all events)
- "Add Event" button: creates new event, INHERITS field names from previous event with empty values
- "+ Add Field to All Events" button: adds a new field row to every event
- Remove field button (X): removes from all events
- Remove event button: removes single event column
- Max: 50 events, 30 fields (from limits.ts, disable buttons at limit)
- All inputs have placeholder "value" for values, "field name" for field names

4. packages/playground/src/main/webapp/components/inputs/JsonInputView.tsx

- TextArea with monospace font
- DEBOUNCED store update: local state for instant typing, debounced 300ms sync to store
- JSON validation on each change: red border + error message if invalid
- Placeholder: "Paste your JSON data here..."
- Import debounce from lodash

All read from useTestStore(). Placeholders everywhere, no default values.
```

---

## Phase 7: Event Generator

Attach: `docs/spec-06-generator.md`, `docs/spec-19-ux-polish.md`

Prompt:
```
Create the event generator with progressive disclosure — user picks type FIRST, then sees config.

1. packages/playground/src/main/webapp/features/eventGenerator/GeneratorPanel.tsx

- Switch toggle to enable/disable generator
- When enabled: event count input (placeholder "number of events") + "Add Rule" button
- List of GeneratorRule components
- Disabled at MAX_GENERATOR_EVENTS for count

2. packages/playground/src/main/webapp/features/eventGenerator/GeneratorRule.tsx

Each rule shows:
- Field name input (placeholder "field name")
- Generation Type dropdown with NO default selected. Placeholder: "Select type..."
- Dropdown options with descriptions:
  pick_list: "Pick List — Random from weighted list"
  numbered: "Numbered — Sequential (server-001, 002...)"
  random_number: "Random Number — Range with decimals"
  unique_id: "Unique ID — UUID or custom format"
  email: "Email — Generated email addresses"
  ip_address: "IP Address — Private or public ranges"
  general_field: "General — Custom prefix/suffix + random"
- Config area: ONLY renders after type is selected
- Delete rule button

3. Config components (one per type):
- features/eventGenerator/configs/PickListConfig.tsx — add/remove items with value + weight inputs
- features/eventGenerator/configs/RandomNumberConfig.tsx — min, max, decimals
- features/eventGenerator/configs/NumberedConfig.tsx — prefix, suffix, start
- features/eventGenerator/configs/IpAddressConfig.tsx — type dropdown (private_a, private_b, private_c, public_ipv4)
- features/eventGenerator/configs/UniqueIdConfig.tsx — format selector
- features/eventGenerator/configs/EmailConfig.tsx — domain variants with weights
- features/eventGenerator/configs/GeneralFieldConfig.tsx — prefix, suffix, random component config

Changing type resets config to empty defaults for the new type. All use store actions.
```

---

## Phase 8: Validation + Results

Attach: `docs/spec-05-fields.md`, `docs/spec-13-results.md`, `docs/spec-14-errors.md`

Prompt:
```
Create validation section and results panel.

1. packages/playground/src/main/webapp/features/validation/ValidationSection.tsx

- ValidationType toggle: Standard | iJump Alert (two buttons)
- Message on change:
  Standard: "Define conditions per output field. Results checked against these rules."
  iJump: "Requires _time, reason, status. Custom conditions can be added below."
- Renders FieldConditionsGrid or IjumpValidation based on type

2. packages/playground/src/main/webapp/features/validation/FieldConditionsGrid.tsx

List of field conditions. Each row:
- Field name input (placeholder "e.g., count, src_ip, status")
- Operator dropdown (16 operators from ConditionOperator type)
- Value input (HIDDEN for is_empty, is_not_empty, is_timestamp). Placeholder: "expected value"
- ScenarioScope dropdown: "All Scenarios" or individual scenario names
- Delete button (X)
- "Add Condition" button (disabled at MAX_CONDITIONS)

Result Count section at bottom:
- Switch toggle to enable
- When enabled: operator dropdown + value input

3. packages/playground/src/main/webapp/features/validation/IjumpValidation.tsx

- 3 locked rows: _time, reason, status (always present, not deletable)
- Each shows allowed operators only
- Section below for custom conditions (same as FieldConditionsGrid)

4. packages/playground/src/main/webapp/features/results/ResultsPanel.tsx

Shows after test run:
- QueryErrorsCard: red cards for each error message
- QueryWarningsCard: yellow cards for warnings
- Per-scenario results: ScenarioResultCard for each scenario
- Overall summary bar: "3/5 scenarios passed"

5. packages/playground/src/main/webapp/features/results/ScenarioResultCard.tsx

- Scenario name + pass/fail badge
- Per-input results
- Per-event field validation results
- MULTIVALUE DISPLAY: split field values on '\n', render each on own line
- Color coding: pass=green, fail=red
- Severity colors: fatal/error=red, warning=orange, caution=yellow, info=blue

All read from useTestStore() selectTestResponse.
```

---

## Phase 9: Run Button + Pre-flight + Final Polish

Attach: `docs/spec-19-ux-polish.md`

Prompt:
```
Final phase — wire everything together.

1. Update StartPage.tsx to add RunButton area:

Run button states:
- Ready: "Run Test" green button
- Running: "Cancel" red button with spinner
- Done/Error: "Rerun Test" blue button

Cancel uses store.cancelTest() which calls abortController.abort()
Timeout: 120 seconds auto-cancel with message "Test timed out after 2 minutes."

2. Create packages/playground/src/main/webapp/utils/preflight.ts

Pre-flight validation function: validateBeforeRun(test: TestDefinition): string[]

Returns array of error messages. Checks:
- No app selected: "Select a Splunk app."
- No SPL query: "Enter a query or select a saved search."
- Standard test: any input missing rowIdentifier: "[Scenario/Input]: row identifier required."
- Value without field name: "[Scenario/Input]: field name required."
- JSON mode invalid syntax: "[Scenario/Input]: invalid JSON."
- Generator ON with no rules: "Add rules or disable generator."
- Generator rule with no type selected: "Select generation type for [field]."

3. Create packages/playground/src/main/webapp/utils/payloadBuilder.ts

buildPayload(test: TestDefinition): object

Applies fallbacks at submission time:
- Empty test name becomes "Untitled Test"
- Empty scenario name becomes "Scenario 1", "Scenario 2", etc.
- Strips empty field conditions
- Returns the payload shape ready for testApi.runTest()

4. Wire RunButton in StartPage:
- On click: run preflight. If errors, show first error, scroll to it, do NOT run.
- If clean: build payload, call store.runTest(payload)

5. Make sure all inputs have placeholders per spec section 19.10:
- Test name: "Put your test name here..."
- Scenario name: "e.g., Normal user activity, Brute force attack..."
- Row identifier: "e.g., index=main sourcetype=access_combined"
- All field value inputs: "value" / "field name"
- JSON editor: "Paste your JSON data here..."
- Validation fields: "e.g., count, src_ip, status"
```

---

## After All Phases

Run `npm run dev` and verify everything works together. Then:

1. Test save/load (download JSON, re-upload)
2. Test add/delete scenarios, inputs, events
3. Test field inheritance (add event copies field names)
4. Test add field to all events
5. Test pre-flight validation (try running with empty required fields)
6. Test cancel button during mock run

When deploying to closed network:
- Add @splunk/react-ui and @splunk/themes to package.json
- Replace common/ wrappers with real Splunk component imports
- Replace mock API functions with real endpoints
- Replace ThemeProvider with SplunkThemeProvider

---

---

# BACKEND IMPLEMENTATION GUIDE
# Python REST handler — packages/playground/stage/bin/

## Strategy
All backend code lives in `packages/playground/stage/bin/`.
Spec files live in `docs/spec-00-conventions.md` through `docs/spec-11-executor-logger.md`.
Full module map and responsibilities: `BACKEND.md`.

Always attach `docs/spec-00-conventions.md` to every backend prompt — it has the Python 3.7
conventions, registry patterns, and correct/wrong examples that prevent the most common mistakes.

Use **Sonnet** for all code generation. Attach only the spec files relevant to the current phase.

---

## Backend Phase 1: Foundation (logger + payload parser)

Attach: `docs/spec-00-conventions.md`, `docs/spec-01-overview.md`, `docs/spec-03-payload.md`

Prompt:
```
Read the attached spec files.

Create 2 files in packages/playground/stage/bin/:

1. logger.py
- get_logger(name: str) -> logging.Logger
- Writes to /opt/splunk/var/log/splunk/query_tester.log
- Path overridable via QUERY_TESTER_LOG env var
- Format: %(asctime)s %(levelname)-8s [%(name)s] %(message)s
- Deduplicates handlers — safe to call multiple times
- No print() anywhere

2. payload_parser.py
- Dataclasses: FieldCondition, ResultCount, ValidationConfig,
  GeneratorRule, GeneratorConfig, ParsedInput, ParsedScenario, TestPayload
- parse(raw: dict) -> TestPayload  — main entry point
- camelCase -> snake_case mapping exactly as in spec-03
- RENAME: frontend "operator" -> dataclass field "condition"
- Normalization: missing keys, null values, absent scenarios (query_only)
- from __future__ import annotations at top of every file
- Python 3.7: Optional[X] not X | None
```

---

## Backend Phase 2: SPL Analysis + Injection

Attach: `docs/spec-00-conventions.md`, `docs/spec-05-spl-injection.md`, `docs/spec-06-spl-analyzer.md`

Prompt:
```
Read the attached spec files.

Create 2 files in packages/playground/stage/bin/:

1. spl_analyzer.py
- analyze(spl: str) -> SplAnalysis dataclass
- SplAnalysis fields: unauthorized_commands, unusual_commands, uniq_limitations, commands_used
- Unauthorized: delete, drop, truncate, remove, clean, disable, enable, restart
- Unusual (warn but allow): join, append, appendcols, map, sendemail, outputlookup
- Detects uniq/dedup limitation warnings
- Read-only — never modifies SPL

2. query_injector.py
- detect_strategy(spl: str) -> str
  Check in order: inputlookup, tstats, lookup, standard (has index=), no_index
- inject(spl, run_id, strategy, inputs) -> str
- STRATEGY_HANDLERS registry dict — no if/elif chains
- Only replaces OUTER index= (never inside subsearch brackets)
- Replaces full rowIdentifier string first, regex fallback second
- no_index: prepend index=temp_query_tester run_id=<run_id>
```

---

## Backend Phase 3: Data Layer (event generator + indexer + lookup)

Attach: `docs/spec-00-conventions.md`, `docs/spec-08-event-generator.md`, `docs/spec-09-data-indexer.md`

Prompt:
```
Read the attached spec files.

Create 3 files in packages/playground/stage/bin/:

1. event_generator.py
- build_events(inp: ParsedInput) -> List[dict]
- If generator disabled: return inp.events filtered to non-empty
- If generator enabled: copy inp.events[0] as template, apply rules, produce event_count events
- GENERATOR_REGISTRY dict for all 7 types:
  numbered, pick_list, random_number, unique_id, email, ip_address, general_field
- Weight normalization for pick_list variants
- No file I/O, no Splunk calls

2. data_indexer.py
- index_events(events: List[dict], run_id: str, session_key: str) -> None
- Uses makeresults + collect approach
- JSON via eval — NO single quotes in SPL
- Batch 1000 events per collect call
- cleanup(run_id: str, session_key: str) -> None — delete index=temp_query_tester run_id=<run_id>

3. lookup_manager.py
- create_temp_lookup(run_id: str, events: List[dict]) -> str  — returns CSV file path
- delete_temp_lookup(run_id: str) -> None
- CSV written to Splunk lookups dir: /opt/splunk/etc/apps/<app>/lookups/
- No SPL execution — file I/O only
```

---

## Backend Phase 4: Execution + Validation

Attach: `docs/spec-00-conventions.md`, `docs/spec-10-result-validator.md`, `docs/spec-11-executor-logger.md`

Prompt:
```
Read the attached spec files.

Create 2 files in packages/playground/stage/bin/:

1. query_executor.py
- QueryExecutor(session_key: str)
- run(spl: str) -> List[dict]  — executes SPL, returns list of result rows as dicts
- Uses splunklib.client.connect / service.jobs.oneshot
- Converts splunklib ResultsReader rows to plain dicts
- Logs execution time
- Raises on Splunk error — caller handles exception

2. result_validator.py
- validate(validation: ValidationConfig, scenario: ParsedScenario, results: List[dict])
  -> Tuple[List[ValidationDetail], bool]
- ValidationDetail dataclass: field, condition, expected, actual, passed, message
- CONDITION_HANDLERS registry dict:
  equals, not_equals, contains, not_contains, regex, greater_than, less_than,
  greater_or_equal, less_or_equal, is_empty, is_not_empty, in_list
- Run ALL conditions — no short-circuit on first failure
- Pass condition: ANY row satisfies it (not all rows)
- scenarioScope filtering: skip condition if scenario not in scope list
- Empty results + no result_count check -> auto-fail
```

---

## Backend Phase 5: Orchestration (test runner)

Attach: `docs/spec-00-conventions.md`, `docs/spec-04-run-loop.md`, `docs/spec-07-response.md`

Prompt:
```
Read the attached spec files.

Create 1 file in packages/playground/stage/bin/:

test_runner.py
- TestRunner(session_key: str)
- run_test(raw_payload: dict) -> Tuple[dict, int]
- Parse payload once, resolve SPL once, analyze SPL once
- For each scenario:
  - run_id = uuid4().hex[:8]  (unique per scenario)
  - build all events from inputs via EventGenerator
  - index all events together under same run_id
  - inject SPL with run_id
  - run ONE query
  - validate ALL conditions
  - cleanup in finally block
- _build_response() -> dict with exact camelCase keys (see spec-07)
- No dataclasses.asdict() — explicit _to_dict() helpers
- status: success/partial/error based on scenario pass counts
```

---

## Backend Phase 6: Entry Point

Attach: `docs/spec-00-conventions.md`, `docs/spec-02-entry-point.md`, `docs/spec-07-response.md`

Prompt:
```
Read the attached spec files.

Create 1 file in packages/playground/stage/bin/:

query_tester.py
- Splunk REST handler — extends splunk.rest.BaseRestHandler
- #!/usr/bin/env python3 shebang (this file only)
- handle_POST(confInfo): extract session_key, parse JSON body,
  instantiate TestRunner(session_key), call run_test(payload), return JSON
- handle_GET(confInfo): return {"status": "ok", "service": "splunk_query_tester"}
- All errors caught and returned as {"status": "error", "message": str(e)}
- No business logic in this file — only HTTP wiring
- No print() anywhere
```

---

## Backend verification checklist

After all phases, manually verify:
1. LF line endings on every file: `file bin/*.py` should show no CRLF
2. Run each file directly with Splunk's Python: `/opt/splunk/bin/python3 bin/logger.py`
3. No import errors: `python3 -c "import payload_parser"` from bin/
4. restmap.conf exists and handler class name matches query_tester.py class name
5. Log file appears at /opt/splunk/var/log/splunk/query_tester.log after first request