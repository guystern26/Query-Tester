# Spec 09 — State Management

## Store Architecture

Single Zustand v4 store with Immer middleware at `core/store/testStore.ts`.

```ts
import create from 'zustand'; // default import — { create } is v5+
```

All 14 slices composed into one `create()` call via the `...slice(set, get)` spread pattern.

---

## Slices (14 total)

| # | File | Responsibility |
|---|------|---------------|
| 1 | `testSlice.ts` | CRUD for `TestDefinition[]`, `activeTestId` management |
| 2 | `scenarioSlice.ts` | Add/remove/rename/clone scenarios |
| 3 | `inputSlice.ts` | Add/remove inputs, set mode, manage events and field values |
| 4 | `querySlice.ts` | SPL text, time range, saved search selection |
| 5 | `validationSlice.ts` | Field groups, conditions, result count, validation type/scope |
| 6 | `generatorSlice.ts` | Event generator config per input |
| 7 | `runSlice.ts` | Test execution state: `isRunning`, `testResponse`, abort |
| 8 | `fileSlice.ts` | Save/load JSON files, import/export |
| 9 | `testLibrarySlice.ts` | Saved tests CRUD, load into builder, SPL drift check |
| 10 | `scheduledTestsSlice.ts` | Scheduled test CRUD, run history, cron management |
| 11 | `testLoaderSlice.ts` | Loading state for test fetch operations |
| 12 | `configSlice.ts` | Admin config: `fetchAppConfig`, `saveConfigSection`, `getSecret` |
| 13 | `commandPolicySlice.ts` | Dangerous command policy list |
| 14 | `helpers.ts` | Shared lookup functions (not a slice, but composed alongside) |

Supporting type files in `slices/`: `configTypes.ts`, `testLibraryTypes.ts`.

---

## Key Root State

```ts
{
  tests: TestDefinition[];
  activeTestId: string | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
  savedTestId: string | null;
  savedTestVersion: number | null;
  hasUnsavedChanges: boolean;
  splDriftWarning: string | null;
  appConfig: AppConfig | null;
  savedTests: SavedTestMeta[];
  scheduledTests: ScheduledTest[];
}
```

---

## Selectors (`selectors.ts`)

Derived state computed from root state:
- `selectActiveTest` — current TestDefinition by activeTestId
- `selectActiveScenario` — current scenario within active test
- `selectActiveInput` — current input within active scenario
- Additional selectors for filtered/computed views.

---

## Change Detection (`changeDetectionFlag.ts`)

Tracks unsaved changes by comparing test references. Sets `hasUnsavedChanges` flag when the `tests` array reference changes after a save point. Used by UnsavedChangesModal to prompt before navigation.

---

## Helpers (`helpers.ts`)

Shared lookup functions used across slices:
- `findTest(tests, testId)` — find test by ID
- `findScenario(test, scenarioId)` — find scenario within a test
- `findInput(scenario, inputId)` — find input within a scenario
- `deepCloneTestWithNewIds(test)` — deep clone with fresh UUIDs

---

## Patterns

- **Component access:** `useTestStore()` with inline selectors. Never prop drill beyond one level.
- **No API calls in components.** Always dispatch through store actions which call API functions.
- **Immer middleware:** All `set()` calls can mutate state directly (Immer produces immutable updates).
- **IDs:** All generated via `crypto.randomUUID()`.
- **Async actions:** Store actions that call APIs use `get()` for current state, `set()` for updates. Error handling within the action, not the component.

---

## Constants (`core/constants/`)

| File | Contents |
|------|----------|
| `defaults.ts` | Default values for new tests, scenarios, inputs |
| `limits.ts` | MAX_DISPLAY_ROWS, size limits |
| `commandPolicy.ts` | Dangerous command names |
| `scheduledTests.ts` | Scheduled test defaults, status values |
