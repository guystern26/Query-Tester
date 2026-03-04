# Splunk Query Tester — Technical Architecture

Comprehensive technical reference for the Splunk Query Tester frontend application.

---

## Table of Contents

1. [Build System & Toolchain](#1-build-system--toolchain)
2. [React 16 Compatibility Layer](#2-react-16-compatibility-layer)
3. [Zustand Store Architecture](#3-zustand-store-architecture)
4. [Data Model & Type System](#4-data-model--type-system)
5. [Styling System](#5-styling-system)
6. [API & Backend Communication](#6-api--backend-communication)
7. [Third-Party Libraries](#7-third-party-libraries)
8. [File & Directory Structure](#8-file--directory-structure)
9. [Key Patterns & Conventions](#9-key-patterns--conventions)
10. [Splunk Deployment Model](#10-splunk-deployment-model)

---

## 1. Build System & Toolchain

### 1.1 Runtime Requirements

| Tool       | Version     | Notes                                            |
|------------|-------------|--------------------------------------------------|
| Node.js    | >= 18.12.0  | No `using` keyword (Node 20+), no `import.meta.dirname` (Node 21+) |
| npm        | (bundled)   | Standard package manager                          |
| TypeScript | ^5.2.2      | Strict mode OFF (`"strict": false`)               |

### 1.2 Vite Configuration

**File:** `vite.config.ts`

Vite 4.5.x serves as the dev server and production bundler.

```ts
export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],  // React 16 requires classic JSX transform
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  // ...
});
```

Key settings:

| Setting                | Value                                              | Why                                                    |
|------------------------|----------------------------------------------------|--------------------------------------------------------|
| `jsxRuntime`           | `'classic'`                                        | React 16 has no automatic JSX transform                |
| `build.outDir`         | `packages/playground/stage/appserver/static/pages`  | Splunk app static asset directory                      |
| `build.rollupOptions.output.entryFileNames` | `start.js`                    | Single bundle for Splunk page                          |
| `build.rollupOptions.output.assetFileNames` | `[name].[ext]`                | CSS becomes `index.css`                                |
| `server.port`          | `3000`                                             | Local dev server                                       |
| `server.proxy./splunkd`| `http://localhost:8000`                            | Proxies Splunk REST API during dev                     |

### 1.3 Path Aliases

Defined in both `vite.config.ts` (resolve.alias) and `tsconfig.json` (paths). Must be kept in sync.

| Alias          | Resolves To                                          |
|----------------|------------------------------------------------------|
| `core`         | `./core`                                             |
| `@`            | `./packages/playground/src/main/webapp`              |
| `@types`       | `./packages/playground/src/main/webapp/core/types`   |
| `@constants`   | `./packages/playground/src/main/webapp/core/constants`|
| `@store`       | `./packages/playground/src/main/webapp/core/store`   |
| `@api`         | `./packages/playground/src/main/webapp/api`          |
| `@hooks`       | `./packages/playground/src/main/webapp/hooks`        |
| `@utils`       | `./packages/playground/src/main/webapp/utils`        |
| `@common`      | `./packages/playground/src/main/webapp/common`       |
| `@components`  | `./packages/playground/src/main/webapp/components`   |
| `@features`    | `./packages/playground/src/main/webapp/features`     |

### 1.4 TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react",
    "strict": false,
    "esModuleInterop": true,
    "noEmit": true
  },
  "include": ["packages/playground/src/main/webapp/**/*"]
}
```

Note: `"jsx": "react"` matches the classic JSX transform. The `include` only covers webapp files; `core/` types are resolved via path aliases.

### 1.5 Build Commands

| Command        | Action                                  |
|----------------|-----------------------------------------|
| `npm run dev`  | `vite` — starts dev server on port 3000 |
| `npm run build`| `tsc && vite build` — type-check + bundle |
| `npm run preview` | `vite preview` — preview production build |

---

## 2. React 16 Compatibility Layer

### 2.1 Version

React **16.13.1** with matching react-dom. This is a hard constraint — the app must run inside Splunk's dashboard framework which provides React 16.

### 2.2 Entry Point

**File:** `packages/playground/src/main/webapp/pages/start/index.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import './globals.css';
import { StartPage } from './StartPage';

ReactDOM.render(
  <StartPage />,
  document.getElementById('root')
);
```

Uses `ReactDOM.render()` — NOT `createRoot()` (React 18+).

### 2.3 Banned APIs

These APIs do NOT exist in React 16 and must NEVER be used:

| API                         | Available Since | Alternative                    |
|-----------------------------|----------------|--------------------------------|
| `createRoot` / `hydrateRoot`| React 18       | `ReactDOM.render()`            |
| `useId`                     | React 18       | `genId()` from defaults.ts     |
| `useTransition`             | React 18       | Manual state management        |
| `useDeferredValue`          | React 18       | `useMemo` + debounce           |
| `useSyncExternalStore`      | React 18       | Zustand handles this internally|
| `useInsertionEffect`        | React 18       | `useEffect` or `useLayoutEffect`|
| `startTransition`           | React 18       | N/A                            |
| `flushSync`                 | React 18       | N/A                            |
| Automatic batching          | React 18       | Only event handlers batch in 16|

### 2.4 Safe APIs

These React APIs are fully available and used throughout:

- `useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`
- `React.memo`, `forwardRef`
- `createPortal` (react-dom)

### 2.5 Batching Caveat

React 16 only batches state updates inside synchronous event handlers. Updates inside `setTimeout`, `Promise.then`, or async functions are NOT batched — each `setState` triggers a separate render. The codebase uses Zustand's Immer middleware which handles this by applying all mutations in a single draft, avoiding the batching limitation.

---

## 3. Zustand Store Architecture

### 3.1 Store Creation

**File:** `core/store/testStore.ts`

```ts
import create from 'zustand';          // v4 default export
import { immer } from 'zustand/middleware/immer';

export const useTestStore = create<TestStoreState>()(
  immer((set, get) => ({
    tests: [initialTest],
    activeTestId: initialTest.id,
    isRunning: false,
    testResponse: null,
    resultsBarExpanded: false,

    ...testSlice(set, get),
    ...scenarioSlice(set),
    ...inputSlice(set),
    ...querySlice(set),
    ...validationSlice(set),
    ...generatorSlice(set),
    ...runSlice(set, get),
    ...fileSlice(set, get),
  }))
);
```

**Critical:** Zustand v4 uses `import create from 'zustand'` (default export). Named export `{ create }` is v5+ only.

### 3.2 Middleware

**Immer** (`zustand/middleware/immer`) — all `set()` callbacks receive a mutable draft. Mutations are converted to immutable updates automatically.

```ts
// Inside a slice:
set((draft) => {
  const input = findInput(scenario, inputId);
  if (input) input.jsonContent = jsonContent;  // direct mutation on draft
});
```

### 3.3 Store State Shape

```ts
interface TestStoreState {
  // ── Data ──
  tests: TestDefinition[];
  activeTestId: EntityId | null;

  // ── Run state ──
  isRunning: boolean;
  testResponse: TestResponse | null;
  resultsBarExpanded: boolean;

  // ── Actions (8 slices) ──
  // ... 40+ action methods
}
```

### 3.4 Slice Architecture

Each slice is a function that receives `set` (and optionally `get`) and returns an object of action methods. Slices are spread into the store at creation time.

| Slice              | File                            | Responsibilities                          | Needs `get`? |
|--------------------|---------------------------------|-------------------------------------------|-------------|
| `testSlice`        | `slices/testSlice.ts`           | CRUD tests, duplicate, set active         | Yes         |
| `scenarioSlice`    | `slices/scenarioSlice.ts`       | Add/delete/rename scenarios               | No          |
| `inputSlice`       | `slices/inputSlice.ts`          | Inputs, events, field values, mode switch | No          |
| `querySlice`       | `slices/querySlice.ts`          | SPL query, saved search origin            | No          |
| `validationSlice`  | `slices/validationSlice.ts`     | Field groups, conditions, result count    | No          |
| `generatorSlice`   | `slices/generatorSlice.ts`      | Generator rules, enable/disable, event count | No       |
| `runSlice`         | `slices/runSlice.ts`            | Run/cancel test, manage response          | Yes         |
| `fileSlice`        | `slices/fileSlice.ts`           | Save/load test definitions as JSON files  | Yes         |

### 3.5 Slice Helpers

**File:** `core/store/slices/helpers.ts`

Shared lookup functions used by all slices to traverse the entity hierarchy:

```ts
findTest(draft.tests, testId)       → TestDefinition | undefined
findScenario(test, scenarioId)      → Scenario | undefined
findInput(scenario, inputId)        → TestInput | undefined
deepCloneTestWithNewIds(test)       → TestDefinition  // for duplication
```

All lookups are linear scans (entity counts are small — max 20 tests, 10 scenarios, 10 inputs).

### 3.6 Selectors

**File:** `core/store/selectors.ts`

Pure functions that extract derived data from store state:

```ts
selectActiveTest(s)       → TestDefinition | null
selectActiveTestId(s)     → EntityId | null
selectTests(s)            → TestDefinition[]
selectTestCount(s)        → number
selectActiveTestIndex(s)  → number
selectTestResponse(s)     → TestResponse | null
selectIsRunning(s)        → boolean
selectErrors(s)           → ResponseMessage[]
selectWarnings(s)         → ResponseMessage[]
selectHasResults(s)       → boolean
selectScenario(s, id)     → Scenario | null
selectInput(s, scenId, inpId) → TestInput | null
```

**Usage pattern** — selectors receive the full store state (not a draft):

```tsx
const state = useTestStore();
const test = selectActiveTest(state);
```

### 3.7 Action Addressing

All mutating actions address entities via a cascade of IDs:

```
testId → scenarioId → inputId → eventId → fieldValueId
```

This mirrors the hierarchical data model. Example:

```ts
store.updateFieldValue(testId, scenarioId, inputId, eventId, fieldValueId, { value: 'new' });
```

### 3.8 Run Flow

**File:** `core/store/slices/runSlice.ts`

1. `runTest()` reads `activeTestId` via `get()`, finds the test
2. Creates `AbortController` for cancellation
3. Sets `isRunning = true`, clears `testResponse`
4. Calls `mockRunTest(test, signal)` (async, 2s delay)
5. On success: sets `testResponse`, auto-expands results bar
6. On cancel (`AbortError`): sets error response, does NOT auto-expand
7. On other error: sets error response, auto-expands results bar
8. `cancelTest()` calls `abortController.abort()`

---

## 4. Data Model & Type System

### 4.1 Type Files

| File               | Contents                                               |
|--------------------|--------------------------------------------------------|
| `core/types/base.ts`     | Foundation: `EntityId`, `TestType`, `InputMode`, operators |
| `core/types/generator.ts`| Generator configs for all 7 types                     |
| `core/types/results.ts`  | Response, scenario results, field validation           |
| `core/types/index.ts`    | Re-exports all + defines main interfaces               |

### 4.2 Entity Hierarchy

```
TestDefinition
├── id: EntityId (crypto.randomUUID)
├── name: string
├── app: string
├── testType: 'standard' | 'query_only'
├── query: QueryConfig
│   ├── spl: string
│   └── savedSearchOrigin: string | null
├── scenarios: Scenario[]
│   ├── id, name, description
│   └── inputs: TestInput[]
│       ├── id, rowIdentifier
│       ├── inputMode: 'fields' | 'json' | 'no_events'
│       ├── jsonContent: string
│       ├── events: InputEvent[]
│       │   └── fieldValues: FieldValue[]
│       │       ├── id, field, value
│       ├── fileRef: { name, size } | null
│       └── generatorConfig: GeneratorConfig
│           ├── enabled: boolean
│           ├── eventCount?: number
│           └── rules: FieldGenerationRule[]
└── validation: ValidationConfig
    ├── validationType: 'standard' | 'ijump_alert'
    ├── fieldGroups: FieldConditionGroup[]
    │   ├── field, conditions[], conditionLogic, scenarioScope
    ├── fieldLogic: 'and' | 'or'
    ├── validationScope: ValidationScope
    ├── scopeN: number | null
    └── resultCount: ResultCountRule
```

### 4.3 Foundation Types

```ts
type EntityId = string;                    // crypto.randomUUID()
type TestType = 'standard' | 'query_only';
type ValidationType = 'standard' | 'ijump_alert';
type InputMode = 'json' | 'fields' | 'no_events';

type ConditionOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
  | 'is_empty' | 'is_not_empty' | 'is_timestamp'
  | 'regex' | 'in_list' | 'not_in_list';

type ResultCountOperator = 'equals' | 'greater_than' | 'less_than';
type ResponseMessageSeverity = 'fatal' | 'error' | 'warning' | 'caution' | 'info';
type GeneratorType = 'numbered' | 'pick_list' | 'random_number' | 'unique_id'
                   | 'email' | 'ip_address' | 'general_field';
```

### 4.4 Generator Types

Seven generator types, each with a typed config interface:

| Type             | Config Interface              | Key Fields                                    |
|------------------|-------------------------------|-----------------------------------------------|
| `numbered`       | `NumberedGeneratorConfig`     | `pattern`, `rangeStart`, `rangeEnd`, `padLength` |
| `pick_list`      | `PickListGeneratorConfig`     | `items: PickListItem[]` (value + weight)      |
| `random_number`  | `RandomNumberGeneratorConfig` | `variants[]` with min/max/decimals/prefix/suffix |
| `unique_id`      | `UniqueIdGeneratorConfig`     | `variants[]` with format/prefix/suffix/length |
| `email`          | `EmailGeneratorConfig`        | `variants[]` with localPart/domain/componentType |
| `ip_address`     | `IpAddressGeneratorConfig`    | `variants[]` with ipType/prefix/suffix        |
| `general_field`  | `GeneralFieldGeneratorConfig` | `variants[]` with componentType/prefix/suffix/length |

All variants have `id: EntityId` and `weight: number` for weighted random selection.

The `FieldGenerationRule` uses a generic `config: Record<string, unknown>` at the type level. Components cast to the specific config type.

### 4.5 Result Types

```
TestResponse
├── status: 'success' | 'error' | 'partial'
├── message, testName, testType, timestamp, executionTimeMs
├── errors: ResponseMessage[]
├── warnings: ResponseMessage[]
├── queryInfo: QueryInfo | null
│   └── executedQuery, executionTimeMs, resultCount, scanCount
├── summary: TestResultSummary | null
│   └── totalScenarios, passedScenarios, failedScenarios, etc.
└── scenarioResults: ScenarioResult[]
    ├── scenarioId, scenarioName, passed
    └── inputResults: InputResult[]
        ├── inputId, passed, eventsValidated, eventsPassed
        └── eventResults: EventValidationResult[]
            ├── eventIndex, passed
            └── fieldValidations: FieldValidationResult[]
                └── field, passed, expected, actual, message
```

### 4.6 Entity Limits

**File:** `core/constants/limits.ts`

| Constant                    | Value  |
|-----------------------------|--------|
| `MAX_TESTS_PER_SESSION`     | 20     |
| `MAX_SCENARIOS_PER_TEST`    | 10     |
| `MAX_INPUTS_PER_SCENARIO`   | 10     |
| `MAX_EVENTS_PER_INPUT`      | 50     |
| `MAX_FIELDS_PER_EVENT`      | 30     |
| `MAX_FIELD_GROUPS`          | 20     |
| `MAX_CONDITIONS_PER_GROUP`  | 10     |
| `MAX_GENERATOR_RULES`       | 30     |
| `MAX_GENERATOR_EVENT_COUNT` | 10,000 |

When a limit is reached, the corresponding "Add" button is disabled.

### 4.7 Default Factories

**File:** `core/constants/defaults.ts`

Factory functions create fresh entities with `crypto.randomUUID()` IDs and empty/zero values:

```ts
genId()                          → EntityId
createDefaultTest()              → TestDefinition (1 scenario, 1 input, 1 event)
createDefaultScenario()          → Scenario (1 input)
createDefaultInput()             → TestInput (fields mode, 1 event)
createDefaultEvent()             → InputEvent (1 empty field-value pair)
createDefaultFieldGroup()        → FieldConditionGroup (1 condition: is_not_empty)
createDefaultSingleCondition()   → SingleCondition (is_not_empty, empty value)
createDefaultQueryConfig()       → QueryConfig (empty SPL)
createDefaultValidationConfig()  → ValidationConfig (standard, no groups)
```

### 4.8 Input Mode Behavior

Each `TestInput` has an `inputMode` that determines how data is entered and submitted:

| Mode        | Data Source          | Events Table | JSON Editor | Generator Available When          |
|-------------|----------------------|-------------|-------------|-----------------------------------|
| `fields`    | `events[]` array     | Visible     | Hidden      | At least one named field exists   |
| `json`      | `jsonContent` string | Hidden      | Visible     | JSON parses successfully          |
| `no_events` | None (empty `{}`)    | Hidden      | Hidden      | Never                             |

**Mode switch resets generator:** When switching modes, `generatorConfig` is reset to `{ enabled: false, rules: [], eventCount: <preserved> }`. This prevents stale field suggestions from the previous mode.

---

## 5. Styling System

### 5.1 Tailwind CSS 3

**File:** `tailwind.config.cjs`

```js
module.exports = {
  darkMode: 'class',
  content: ['./packages/playground/src/main/webapp/**/*.{ts,tsx}', './index.html'],
  theme: { extend: { colors: { navy: {...}, btnprimary: {...}, accent: {...} } } },
  plugins: [],
};
```

Important: This is Tailwind v3, NOT v4. Uses `@tailwind base; @tailwind components; @tailwind utilities;` directives.

### 5.2 Custom Color Tokens

#### Navy (backgrounds)

| Token      | Value     | Usage                    |
|------------|-----------|--------------------------|
| `navy-950` | `#0a1628` | Deepest background, inputs |
| `navy-900` | `#162033` | Panels, cards            |
| `navy-800` | `#202b43` | Elevated surfaces, hover |
| `navy-700` | `#2a3a5c` | Borders, dividers        |

#### Accent (text highlights, borders, focus rings)

| Token        | Value                       | Usage                          |
|--------------|-----------------------------|--------------------------------|
| `accent-200` | `#e6f3ff`                   | Light emphasis text            |
| `accent-300` | `#cce6ff`                   | Hover text                     |
| `accent-400` | `#b3d9ff`                   | Active text, step indicators   |
| `accent-500` | `#99ccff`                   | Focus ring tint                |
| `accent-600` | `#80bfff`                   | Focus borders                  |
| `accent-700` | `#66b3ff`                   | Strong emphasis                |
| `accent-900` | `rgba(179,217,255,0.15)`    | Translucent backgrounds        |

#### Button Primary

| Token              | Value     | Usage                         |
|--------------------|-----------|-------------------------------|
| `btnprimary`       | `#60A5FA` | Primary button background     |
| `btnprimary-hover` | `#4A90E2` | Primary button hover          |

Primary buttons use `bg-btnprimary text-white`. There is NO cyan, sky, or indigo accent in this project.

### 5.3 Standard Text Colors

| Context     | Class          |
|-------------|----------------|
| Primary     | `text-slate-200` |
| Secondary   | `text-slate-400` |
| Muted       | `text-slate-500` |
| Borders     | `border-slate-700` |
| Placeholder | `placeholder-slate-500` |

### 5.4 styled-components v5

Used ONLY for the `common/` wrapper components (ThemeProvider, etc). New components use Tailwind utility classes exclusively.

**Rule:** Never mix styled-components and Tailwind on the same element.

### 5.5 Animations

**File:** `packages/playground/src/main/webapp/pages/start/globals.css`

Custom animations defined as CSS keyframes and applied via Tailwind classes:

| Class                    | Effect                                                |
|--------------------------|-------------------------------------------------------|
| `animate-fadeIn`         | Opacity 0 → 1 over 300ms                             |
| `animate-panelReveal`    | Opacity + translateY reveal with staggered delays     |
| `animate-generatorGlow`  | Yellow-gold border/shadow pulse for generator button  |

Panel stagger delays: `.panel-delay-0`, `.panel-delay-1`, `.panel-delay-2` (0ms, 100ms, 200ms).

---

## 6. API & Backend Communication

### 6.1 Splunk REST API Proxy

**File:** `packages/playground/src/main/webapp/api/splunkApi.ts`

During development, Vite proxies `/splunkd` to `http://localhost:8000`. In production (inside Splunk), requests go directly to the Splunk REST API.

Used for: fetching saved searches.

### 6.2 Test Run API

**File:** `packages/playground/src/main/webapp/api/testApi.ts`

Currently a **mock implementation** that returns a fake `TestResponse` after a 2-second delay. Supports `AbortSignal` for cancellation.

```ts
export async function runTest(payload: RunTestPayload, signal: AbortSignal): Promise<TestResponse>
```

The real implementation will POST to a custom Splunk REST endpoint.

### 6.3 Payload Builder

**File:** `utils/payloadBuilder.ts`

Transforms the in-memory `TestDefinition` into the API payload shape:

```ts
buildPayload(test: TestDefinition): ApiPayload
buildEventsForInput(input: TestInput): Record<string, string>[]
```

**Input mode handling:**
- `fields` → Converts `events[].fieldValues[]` to `Record<string, string>[]`
- `json` → Parses `jsonContent` string, returns array of objects
- `no_events` → Returns `[{}]`

**Validation flattening:** `fieldGroups[].conditions[]` is flattened into a single `fieldConditions[]` array where each entry carries the parent group's `field` and `scenarioScope`.

### 6.4 Preflight Validation

**File:** `packages/playground/src/main/webapp/utils/preflight.ts`

```ts
validateBeforeRun(test: TestDefinition): string[]
```

Returns an array of human-readable error strings. Checks:

1. App name is required
2. SPL query is required
3. Every input must have a row identifier (standard mode only)
4. Field values cannot have values without field names
5. JSON inputs must be valid JSON
6. Generator enabled requires at least one rule
7. Generator rules must have a type

### 6.5 Mock Results

**File:** `packages/playground/src/main/webapp/utils/mockResults.ts`

Generates realistic-looking mock `TestResponse` data including scenario results, input results, and field validations. Used until the real backend is connected.

---

## 7. Third-Party Libraries

### 7.1 Dependencies

| Package             | Version    | Usage                                              |
|---------------------|------------|---------------------------------------------------|
| `react`             | 16.13.1    | UI framework (pinned, NOT semver range)            |
| `react-dom`         | 16.13.1    | DOM rendering via `ReactDOM.render()`              |
| `zustand`           | ^4.5.5     | State management (v4, default export `create`)     |
| `immer`             | ^10.0.0    | Immutable state via mutable drafts                 |
| `styled-components` | ^5.3.11    | CSS-in-JS for common/ components only              |
| `lodash`            | ^4.17.21   | `debounce` used in JsonInputView                   |
| `lucide-react`      | ^0.263.1   | Icon library (used in some components)             |

### 7.2 Dev Dependencies

| Package                | Version    | Usage                               |
|------------------------|------------|-------------------------------------|
| `typescript`           | ^5.2.2     | Type checking (noEmit mode)         |
| `vite`                 | ^4.5.0     | Dev server + bundler                |
| `@vitejs/plugin-react` | ^4.0.4    | React support with classic JSX      |
| `tailwindcss`          | ^3.4.19   | Utility-first CSS framework         |
| `postcss`              | ^8.5.8    | CSS processing                      |
| `autoprefixer`         | ^10.4.27  | Vendor prefix addition              |
| `@types/react`         | ^16.14.0  | React 16 type definitions           |
| `@types/react-dom`     | ^16.9.0   | ReactDOM 16 type definitions        |
| `@types/lodash`        | ^4.14.202 | Lodash type definitions             |
| `@types/styled-components` | ^5.1.26 | styled-components type definitions |

---

## 8. File & Directory Structure

### 8.1 Top-Level Layout

```
splunk-query-tester/
├── core/                          # Shared: types, store, constants
│   ├── types/
│   │   ├── base.ts                # Foundation types (EntityId, enums)
│   │   ├── generator.ts           # Generator config interfaces
│   │   ├── results.ts             # Response/result types
│   │   └── index.ts               # Re-exports all types
│   ├── store/
│   │   ├── testStore.ts           # Zustand store creation
│   │   ├── selectors.ts           # Pure selector functions
│   │   └── slices/
│   │       ├── helpers.ts         # Shared lookup helpers
│   │       ├── testSlice.ts       # Test CRUD
│   │       ├── scenarioSlice.ts   # Scenario CRUD
│   │       ├── inputSlice.ts      # Input/event/field CRUD
│   │       ├── querySlice.ts      # Query management
│   │       ├── validationSlice.ts # Validation config
│   │       ├── generatorSlice.ts  # Generator rules
│   │       ├── runSlice.ts        # Test execution
│   │       └── fileSlice.ts       # Save/load files
│   └── constants/
│       ├── defaults.ts            # Factory functions
│       └── limits.ts              # MAX_* constants
├── utils/
│   └── payloadBuilder.ts          # API payload construction
├── packages/playground/src/main/webapp/
│   ├── api/
│   │   ├── splunkApi.ts           # Splunk REST API client
│   │   └── testApi.ts             # Test run API (mock)
│   ├── hooks/
│   │   └── useSavedSearches.ts    # Fetches saved searches from Splunk
│   ├── utils/
│   │   ├── preflight.ts           # Pre-run validation
│   │   ├── mockResults.ts         # Mock test response generator
│   │   └── mockFixtures.ts        # Test fixture data
│   ├── common/                    # Shared UI primitives
│   │   ├── index.ts               # Barrel exports
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Message.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── Switch.tsx
│   │   ├── Tabs.tsx
│   │   ├── TextArea.tsx
│   │   └── ThemeProvider.tsx
│   ├── components/                # Shared complex components
│   │   ├── inputs/
│   │   │   ├── FieldValueEditor.tsx
│   │   │   └── JsonInputView.tsx
│   │   └── test-navigation/
│   │       ├── TopBar.tsx
│   │       ├── TestNavigation.tsx
│   │       └── BugReportButton.tsx
│   ├── features/                  # Feature modules
│   │   ├── eventGenerator/
│   │   │   ├── GeneratorPanel.tsx
│   │   │   ├── GeneratorRule.tsx
│   │   │   ├── configs/
│   │   │   │   ├── EmailConfig.tsx
│   │   │   │   ├── GeneralFieldConfig.tsx
│   │   │   │   ├── IpAddressConfig.tsx
│   │   │   │   ├── NumberedConfig.tsx
│   │   │   │   ├── PickListConfig.tsx
│   │   │   │   ├── RandomNumberConfig.tsx
│   │   │   │   ├── UniqueIdConfig.tsx
│   │   │   │   └── VariantRow.tsx
│   │   │   └── utils/
│   │   │       └── normalizeWeights.ts
│   │   ├── layout/
│   │   │   ├── PipelineConnector.tsx
│   │   │   ├── StepPipeline.tsx
│   │   │   └── usePipelineState.ts
│   │   ├── query/
│   │   │   └── QuerySection.tsx
│   │   ├── results/
│   │   │   ├── ResultsBar.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   └── ScenarioResultCard.tsx
│   │   ├── scenarios/
│   │   │   ├── ScenarioPanel.tsx
│   │   │   ├── InputCard.tsx
│   │   │   ├── FieldValueEditor.tsx
│   │   │   ├── TestTypeSelector.tsx
│   │   │   └── scenarioColors.ts
│   │   └── validation/
│   │       ├── ValidationSection.tsx
│   │       ├── FieldConditionsGrid.tsx
│   │       ├── FieldGroupCard.tsx
│   │       ├── ConditionRow.tsx
│   │       ├── ValidationScope.tsx
│   │       ├── ResultCountSection.tsx
│   │       ├── IjumpValidation.tsx
│   │       ├── IjumpLockedCards.tsx
│   │       ├── IjumpCustomConditions.tsx
│   │       ├── conditionPreview.ts
│   │       └── utils/
│   │           ├── ijumpHelpers.ts
│   │           └── operatorConstants.ts
│   └── pages/
│       └── start/
│           ├── index.tsx           # Entry point (ReactDOM.render)
│           ├── StartPage.tsx       # Root page component
│           └── globals.css         # Global styles + animations
├── index.html                     # HTML shell
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.cjs
├── package.json
└── CLAUDE.md                      # AI coding guidelines
```

### 8.2 Feature Module Pattern

Each feature directory follows this structure:

```
features/<feature>/
├── <Feature>Panel.tsx      # Main panel component
├── <Feature>Card.tsx       # Card-level component (optional)
├── <Feature>Row.tsx        # Row-level component (optional)
├── configs/                # Sub-type configurations (optional)
└── utils/                  # Feature-specific utilities (optional)
```

Features are self-contained. They import from `core/` (types, store, constants), `common/` (UI primitives), and `components/` (shared complex components). Features do NOT import from other features.

---

## 9. Key Patterns & Conventions

### 9.1 Component → Store Access

Components access the store via the `useTestStore()` hook and use selector functions:

```tsx
export function MyComponent() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  // ...
  state.updateSpl(test.id, newSpl);
}
```

No Redux-style `mapStateToProps` or `useSelector`. The entire store is consumed, and selectors filter the data.

### 9.2 ID Cascading

All mutations require the full ID path from test to the target entity:

```ts
store.updateFieldValue(testId, scenarioId, inputId, eventId, fieldValueId, patch);
```

This is explicit and avoids ambiguity in the deeply nested data model.

### 9.3 Debounced Text Inputs

Text inputs that update the store (SPL editor, JSON editor, scenario names) use `lodash/debounce` with a local state buffer:

```tsx
const [value, setValue] = useState(storeValue);
const debouncedUpdate = useMemo(
  () => debounce((next: string) => store.updateX(id, next), 300),
  [store.updateX, id]
);

const handleChange = (next: string) => {
  setValue(next);            // instant local update
  debouncedUpdate(next);    // debounced store update
};
```

### 9.4 Empty State Pattern

**File:** `packages/playground/src/main/webapp/common/EmptyState.tsx`

Shared component for zero-item states with icon, title, subtitle, and CTA button:

```tsx
<EmptyState
  icon={<svg .../>}
  iconBg="bg-purple-900/30"
  title="No validation rules yet"
  subtitle="Add a field to start defining conditions."
  actionLabel="+ Add First Condition"
  onAction={() => store.addFieldGroup(testId)}
/>
```

Used in: GeneratorPanel (0 rules), FieldConditionsGrid (0 conditions), PickListConfig (0 items).

### 9.5 Generator Header UX

**File:** `packages/playground/src/main/webapp/features/scenarios/InputCard.tsx`

The event generator uses a "smart header" pattern:

- **OFF state:** Header row shows zap icon with glow animation, clicking enables + expands
- **ON state:** Header shows event count presets (100/1K/5K/10K) + free input + chevron + toggle
- Click toggle → enable/disable (turning off collapses)
- Click chevron → fold/unfold body
- Generator available in both `fields` and `json` modes

### 9.6 Scenario Colors

**File:** `packages/playground/src/main/webapp/features/scenarios/scenarioColors.ts`

Each scenario gets a distinct color (up to 10 colors cycling). Returns:

```ts
interface ScenarioColor {
  text: string;    // Tab text color
  border: string;  // Active tab border
  dot: string;     // Data indicator dot
  tint: string;    // Card background tint
  cardBorder: string; // Input card accent border
}
```

### 9.7 Validation Type Modes

Two validation modes with different UIs:

| Mode           | UI Components                                        |
|----------------|------------------------------------------------------|
| `standard`     | FieldConditionsGrid, ValidationScope, ResultCount     |
| `ijump_alert`  | IjumpValidation with locked cards + custom conditions |

### 9.8 Preflight → Run → Results Flow

1. User clicks "Run Test" in ResultsBar
2. `validateBeforeRun(test)` checks for errors
3. If errors: auto-expand results bar, show preflight errors
4. If clean: `store.runTest()` → shows spinner in ResultsBar
5. On completion: auto-expands results bar with ScenarioResultCards
6. Cancel available during run via `store.cancelTest()`

### 9.9 File Save/Load

The `fileSlice` handles JSON export/import:

- **Save:** Serializes `TestDefinition[]` → triggers browser download
- **Load:** Parses JSON → validates structure → replaces store state

### 9.10 Bug Report Export

**File:** `packages/playground/src/main/webapp/components/test-navigation/BugReportButton.tsx`

Exports `BugReportPayload` containing: report metadata, current test definition, all test definitions, and latest test response. Used for debugging and issue reporting.

---

## 10. Splunk Deployment Model

### 10.1 App Structure

The project builds into a Splunk app package at:

```
packages/playground/stage/
└── appserver/
    └── static/
        └── pages/
            ├── start.js      # Bundled JS (entry)
            ├── index.css      # Bundled CSS
            └── index.html     # HTML shell (copied)
```

This follows Splunk's convention for custom JavaScript pages: `appserver/static/pages/<page_name>.js`.

### 10.2 HTML Entry

**File:** `packages/playground/stage/appserver/static/pages/index.html`

Minimal HTML shell with a `<div id="root">` mount point. In production, Splunk wraps this in its own chrome (navigation bar, app menu).

### 10.3 Splunk Integration Points

| Feature             | Integration                                          |
|---------------------|------------------------------------------------------|
| Saved searches      | `splunkApi.ts` fetches via Splunk REST API           |
| Test execution      | Future: POST to custom REST endpoint                 |
| App context         | User enters app name; used in API payload            |
| Authentication      | Handled by Splunk session (cookie-based)             |

### 10.4 Dev vs Production

| Concern          | Development                     | Production (Splunk)              |
|------------------|---------------------------------|----------------------------------|
| Server           | Vite dev server (port 3000)     | Splunk web server (port 8000)    |
| API proxy        | Vite proxy `/splunkd` → :8000   | Direct Splunk REST               |
| Hot reload       | Vite HMR                        | N/A (static bundle)             |
| React            | Bundled                         | Bundled (not from Splunk's React)|
| CSS              | PostCSS with Tailwind           | Pre-built `index.css`            |

---

*Generated from source analysis. Last updated: 2026-03-04.*
