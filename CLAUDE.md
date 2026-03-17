# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Initial setup (required once)
yarn run setup            # installs deps + builds all packages

# Development (Vite dev server on port 3000, proxies /splunkd to localhost:8000)
yarn dev

# Build all packages
yarn build

# Build Splunk app bundle only (webpack)
cd packages/query-tester && ./node_modules/.bin/webpack --mode=production

# Lint
yarn lint                                          # all packages
yarn workspace @splunk/query-tester-app run eslint  # single package

# Tests
yarn test                                           # all packages
yarn workspace @splunk/query-tester-app run test    # single package
yarn workspace @splunk/query-tester-app run test:watch

# Backend tests (Python — use `py` on Windows, `python3` on Linux)
cd packages/query-tester/stage/bin && py -m pytest tests/ -v
cd packages/query-tester/stage/bin && py -m pytest tests/test_auth_utils.py -v  # single file

# Format
yarn format               # auto-format all JS/JSX/CSS
yarn format:verify        # check only

# Deploy to Splunk (symlink for dev)
yarn workspace @splunk/query-tester run link:app
```

## Architecture

**Monorepo** with Yarn Workspaces containing two packages:

### `packages/query-tester-app` — React frontend library
- Exports Zustand store, types, components, hooks as `@splunk/query-tester-app`
- **Entry:** `src/StartPage.tsx` (main), `src/dev-entry.tsx` (Vite dev)
- **Store:** Single Zustand v4 store with Immer middleware at `src/core/store/testStore.ts`, composed from 8 slices in `src/core/store/slices/`:
  - `testSlice` (CRUD tests), `scenarioSlice`, `inputSlice`, `querySlice`, `validationSlice`, `generatorSlice`, `runSlice` (test execution state), `fileSlice` (save/load)
  - `helpers.ts` — shared lookup functions (findTest, findScenario, findInput, deepCloneTestWithNewIds)
  - `selectors.ts` — derived state selectors
- **Data hierarchy:** Test -> Scenario[] -> TestInput[] -> InputEvent[] -> FieldValue[]
- **Input modes:** `'json' | 'fields' | 'no_events' | 'query_data'` — each TestInput has a mode determining how events are provided
- **Feature modules:** `src/features/{scenarios,query,results,validation,eventGenerator,layout}/`
- **API layer:** `src/api/` (splunkApi.ts, testApi.ts, llmApi.ts)
- **Config:** `src/config/env.ts` (REST_PATH, LLM_ENDPOINT — rebuild required after changes)

### `packages/query-tester` — Splunk app wrapper + Python backend
- Depends on `@splunk/query-tester-app`
- Builds with Webpack 5 (not Vite) via `webpack.config.js`
- **`stage/`** = the deployed Splunk app directory (symlinked or copied to `$SPLUNK_HOME/etc/apps/query-tester`)
- Frontend bundle output: `stage/appserver/static/pages/`
- Splunk configs: `stage/default/` (app.conf, restmap.conf, web.conf, indexes.conf)
- Entry point: `src/main/webapp/pages/QueryTesterApp/index.tsx`

### Python backend (`packages/query-tester/stage/bin/`)
REST endpoint: `POST /splunkd/__raw/services/splunk_query_tester/query_tester`

**Run loop:** parse payload -> resolve SPL -> analyze SPL -> for each scenario: generate events -> index -> inject SPL -> run query -> validate -> cleanup (in finally)

Key modules and their strict boundaries:
- `query_tester.py` — REST handler entry point (Splunk wiring only). Delegates `/config/*` and `/command_policy/*` sub-paths to their respective handlers.
- `core/test_runner.py` — orchestrator, loops scenarios
- `core/payload_parser.py` — JSON dict -> dataclasses (camelCase -> snake_case)
- `core/response_builder.py` — serializes results to camelCase JSON for frontend
- `core/helpers.py` — shared utilities
- `splunk_connect.py` — centralized `get_service(session_key)` factory. Always connects to localhost via static config.py. All modules use this instead of direct `splunk_client.connect()`.
- `runtime_config.py` — reads dynamic config from KVStore with config.py fallback, 120s TTL cache. Layers: static defaults → KVStore overrides → storage/passwords secrets.
- `config_handler.py` — REST handler for admin Setup page config CRUD, auto-detection, connectivity testing. Invalidates runtime cache and reconfigures log level on save.
- `config_detection.py` — auto-detects Splunk settings (server info, HEC, email, temp index) for Setup page pre-population.
- `config_secrets.py` — reads/writes secrets in Splunk `storage/passwords`. Uses static config directly (NOT `splunk_connect`) to avoid circular dependency with `runtime_config`.
- `config_test_connectivity.py` — tests HEC and SMTP connectivity from Setup page.
- `spl/spl_analyzer.py` — reads SPL only, never modifies
- `spl/query_injector.py` — rewrites SPL, never runs it
- `spl/query_executor.py` — executes SPL via splunklib
- `spl/spl_normalizer.py` — SPL preprocessing before analysis
- `data/data_indexer.py` — indexes events via HEC, cleanup via SPL delete. Reads HEC config dynamically via `_get_hec_config(session_key)`.
- `data/lookup_manager.py` — temp CSV lookup create/delete
- `data/sub_query_runner.py` — executes sub-queries for data inputs
- `generators/event_generator.py` — expands GeneratorConfig, no file I/O or Splunk calls
- `generators/` — per-type modules: numbered.py, pick_list.py, email.py, ip_address.py, unique_id.py, random_number.py, general_field.py
- `validation/result_validator.py` — compares rows to conditions, never runs queries
- `validation/condition_handlers.py` — registry of condition evaluation functions
- `alert_email.py` — email building and SMTP delivery for scheduled test failures. Reads SMTP config dynamically via `_get_email_config(session_key)`. Auto-infers TLS mode from port (587=STARTTLS, 465=SSL).
- `scheduled_runner.py` — scripted input (runs every 60s via inputs.conf). Checks cron schedules, runs due tests, writes history, sends failure emails. Re-reads fresh KVStore record before upsert to avoid clobbering user changes.
- `scheduled_search_manager.py` — creates/updates/deletes backing Splunk saved searches for scheduled tests (UI visibility only).
- `spl_drift.py` — SPL drift detection: compares current saved search SPL against last passed run.
- `cron_matcher.py` — cron expression matching: `cron_matches(expr, dt_tuple)`, `is_enabled(record)`.
- `logger.py` — file-based logging with `reconfigure_log_level(level_str)` for dynamic log level changes.

**Bundled `splunklib/`** — no pip installs; closed network.

---

## CRITICAL CONSTRAINTS — READ BEFORE EVERY CHANGE

### React 16.13.1 — BANNED APIs
NEVER use any of these. They don't exist in React 16:
- `createRoot` / `hydrateRoot` (use `ReactDOM.render()`)
- `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`
- `useInsertionEffect`
- `React.lazy` with `Suspense` for data fetching (only code splitting)
- `startTransition`
- `<StrictMode>` double-render behavior
- Automatic batching (only batches inside event handlers, NOT in promises/timeouts)
- `flushSync`
- `createPortal` is fine (exists since React 16)
- `forwardRef` is fine
- `React.memo` is fine
- `useCallback`, `useMemo`, `useRef`, `useState`, `useEffect`, `useContext` — all fine

### Zustand v4.5.x — Import Style
```ts
// CORRECT
import create from 'zustand';

// WRONG — named export is v5+
import { create } from 'zustand';
```

### Tailwind CSS 3 — NOT v4
- Use `@tailwind base; @tailwind components; @tailwind utilities;` in CSS
- Tailwind v4 uses `@import "tailwindcss"` — DO NOT use that syntax
- `darkMode: 'class'` in config — NOT `darkMode: 'selector'` (v4 syntax)
- All utility classes are v3 compatible

### Code Style (Prettier)
- `tabWidth: 4` (not 2!) for all JS/TS/CSS
- `tabWidth: 2` for JSON files only
- `singleQuote: true`, `printWidth: 100`
- JSX runtime: `classic` (React 16 requirement — Vite config sets `jsxRuntime: 'classic'`)

### Custom Colors — NO CYAN
Backgrounds: navy-950/900/800/700 (#0a1628, #162033, #202b43, #2a3a5c)
Accent text: steel-400 (#9BB1BB)
Primary buttons: #60A5FA (blue-400) with text-white. Hover: #93C5FD. Active: #3B82F6.
Text: slate-200 (primary), slate-400 (secondary)
Borders: slate-700

There is NO cyan, sky, or indigo as accent anywhere in this project.

### styled-components v5
Used for common/ wrappers only. New components use Tailwind classes.
Do NOT mix styled-components and Tailwind on the same element.

### Node 18.12 / Vite 4.5.x
- No `using` keyword (requires Node 20+)
- No `import.meta.dirname` (Node 21+)
- No top-level await in modules
- Vite config uses `defineConfig` from 'vite'

### UI Framework
- Use `@splunk/react-ui` for Button, Card, ControlGroup, Select, TextArea, Message, Modal, Switch, Tabs
- NEVER use MUI (`@mui/*`)
- Wrap app in SplunkThemeProvider family=enterprise colorScheme=dark density=comfortable
- IDs: `crypto.randomUUID()`

---

## BACKEND CONSTRAINTS — Python REST Handler

### Python 3.7 — Splunk limitation
- `Optional[X]` not `X | None`. No walrus `:=`. No `match`. No `list[x]`/`dict[x]` built-in generics.
- `from __future__ import annotations` — first line of every file (after docstring).

### No print() — ever
stdout corrupts Splunk REST handler responses. Use `get_logger(__name__)` from `logger.py`.

### LF line endings only
CRLF causes a 500 "can't start the script" on Linux Splunk. Configure your editor to save LF.

### No external packages
Only stdlib + splunklib. No pip installs — closed network.

### Architecture patterns
- One query per scenario. All inputs indexed together before the query runs.
- Cleanup always in `finally` — even when exceptions thrown.
- Registries not if/elif: `GENERATOR_REGISTRY`, `CONDITION_HANDLERS`, `STRATEGY_HANDLERS`.
- No `dataclasses.asdict()` — produces snake_case. Frontend reads camelCase. Use explicit `_to_dict()`.
- `session_key` injected at construction. Never a global.
- All validation conditions evaluated — no short-circuit on first failure.
- Per-scenario errors don't stop the loop. Fatal errors only on parse/SPL failures.

### Splunk connection rules — CRITICAL
- **All modules** use `splunk_connect.get_service(session_key)` for splunklib connections.
- `splunk_connect.py` always connects to **localhost** via static `config.py` values. Session tokens are bound to the local splunkd — connecting to a different hostname (e.g. auto-detected FQDN) causes "not logged in" errors.
- The `splunk_host` from the Setup page is for **display/URL purposes only** (e.g. email notification links), NOT for API connections.
- **Two exceptions** that must use static config directly (NOT `splunk_connect`):
  1. `kvstore_client.py` — runtime_config is stored in KVStore (circular dependency)
  2. `config_secrets.py` — called by `runtime_config._read_secrets()` (circular dependency: runtime_config → config_secrets → splunk_connect → runtime_config)
- Never add `runtime_config` imports to `splunk_connect.py`, `kvstore_client.py`, or `config_secrets.py`.

### File responsibilities (never cross these)
- `spl_analyzer.py` reads SPL only — never modifies it
- `query_injector.py` rewrites SPL — never runs it
- `result_validator.py` compares rows to conditions — never runs queries
- `event_generator.py` expands GeneratorConfig — no file I/O, no Splunk calls

### Splunk web.conf expose patterns — MUST match restmap sub-paths
`restmap.conf` prefix-matches (e.g. `match = /data/tester` catches `/data/tester/config/status`).
`web.conf` expose patterns do NOT prefix-match — each sub-path needs its own entry.
**Every time a new sub-path is added to a handler, a matching web.conf expose entry MUST be added.**
Current required entries:
```ini
[expose:query_tester]
pattern = data/tester
[expose:query_tester_config]
pattern = data/tester/config/*
[expose:query_tester_command_policy]
pattern = data/tester/command_policy/*
```
Missing expose entries cause 404 errors from the Splunk web proxy even though splunkd handles the route fine.

### KVStore boolean string handling
KVStore converts Python booleans to strings `"1"`/`"0"`. JavaScript `"0"` is truthy.
- **Backend**: `scheduled_tests_handler.py` has `_normalize_bools()` that converts `"0"`/`"false"` → `False` on GET/PUT responses.
- **Frontend**: `scheduledTestsApi.ts` has `normalizeScheduledTest()` as a safety net.
- **scheduled_runner.py**: Checks `alertOnFailure` with `alert_flag in (True, "1", "true", "True")` instead of bare truthiness.
- Always apply both backend and frontend normalization for boolean fields from KVStore.

### SPL data embedding — no single quotes ever
Single quotes break silently in Splunk eval. Use JSON via `eval _raw=` with double-quote escaping.

### Splunk REST response format
```python
data = response.json()
content = data['entry'][0]['content']  # content is nested, not at root
```

### Backend specs
Detailed specs live in `docs/` (32 spec files, spec-00 through spec-20+). Attach `spec-00-conventions.md` to every backend prompt. See `BACKEND.md` for the full prompt sequence and spec index.

---

## Deployment

- **Dev:** Symlink `packages/query-tester/stage` to `$SPLUNK_HOME/etc/apps/query-tester`
- **Python changes:** Just restart Splunk (no rebuild needed)
- **Frontend changes:** Webpack rebuild required, then restart Splunk
- **Config files:** `stage/bin/config.py` (backend static defaults), `src/config/env.ts` (frontend)
- See `DEPLOYMENT.md` for full deployment guide

### Portable Configuration (Setup Page)
The app is fully portable — all deployment config is editable from the admin Setup page (`#setup`). On first load, auto-detection pre-fills most fields from the local Splunk instance.

**Runtime-configurable via Setup page** (stored in KVStore `query_tester_config` + `storage/passwords`):
- Splunk connection: host, port, scheme, username, password (display/URL only — API always uses localhost)
- HEC: host, port, scheme, token, SSL verify, timeout
- Email/SMTP: server, port, from, auth method (none/password/oauth2/apikey), username, password, TLS mode (auto-inferred from port)
- Splunk Web URL, default alert email
- Log level (applied dynamically without restart via `reconfigure_log_level()`)
- LLM: endpoint, API key, model, max tokens

**Static config.py only** (not on Setup page — rarely need changing):
- `ADMIN_ROLES` — list of roles for admin bypass. Only edit if custom SAML roles needed.
- `MAX_QUERY_DATA_EVENTS` (10,000), `HEC_BATCH_SIZE` (1,000), `MAX_DEFINITION_SIZE_BYTES` (25 MB) — safety limits
- `MAX_RUN_HISTORY_PER_TEST` (20) — must match savedsearches.conf janitor
- `TEMP_INDEX` / `TEMP_SOURCETYPE` — hardcoded, shown read-only in UI
- `LOG_FILE` — shown in UI but path only changes at startup (default: `$SPLUNK_HOME/var/log/splunk/query_tester.log`)

---

## Test Library & Scheduled Tests Feature

### New pages
- `packages/query-tester-app/src/pages/library/` — Test Library (home/landing page). Browse all saved tests, load into builder, create new.
- `packages/query-tester-app/src/pages/suites/` — Test Suites (scheduling dashboard). Cron scheduling, run history, SPL drift monitoring.

### New store slices (add to the existing 8)
- `testLibrarySlice` — saved test metadata list, save/load/delete operations
- `scheduledTestsSlice` — scheduled test records, run history, cron management

Root-level store state additions:
- `savedTestId: string | null` — id of the currently loaded saved test (null for new tests)
- `savedTestVersion: number | null` — version counter for optimistic locking (null for new tests)
- `hasUnsavedChanges: boolean` — auto-detected via store subscription comparing `tests` reference
- `splDriftWarning: string | null` — set by `loadTestIntoBuilder` when saved search SPL has changed

### New backend modules (`stage/bin/`)
Following the same strict boundary rules as existing modules:
- `saved_tests_handler.py` — REST handler for `/data/saved_tests`. CRUD for saved tests in KVStore. Reads `createdBy` from session token — never from request body.
- `scheduled_tests_handler.py` — REST handler for `/data/scheduled_tests`. Creates/updates/deletes both the KVStore record AND the backing Splunk saved search.
- `run_history_handler.py` — REST handler for `/data/test_run_history`. Returns last 50 run records sorted by ranAt desc.
- `alert_run_test.py` — Custom alert action entry point. Orchestration only — reads test_id, fetches test, checks SPL drift, runs test, writes result. No business logic.
- `kvstore_client.py` — Raw KVStore CRUD only. No business logic. Methods: get_all, get_by_id, upsert, delete. Returns plain dicts only. Uses static config directly (circular dependency anchor).
- `handler_utils.py` — Shared handler utilities (session key/username extraction, JSON response building, payload normalization, record ID extraction). Imported by handlers — never a handler itself. Contains legacy `is_admin_user(session_key, username)` — prefer `auth_utils.is_admin(session_key)` for new code.
- `auth_utils.py` — Authentication/authorization utilities. `get_current_user_roles(session_key)` calls `authentication/current-context` via splunklib (works with SAML — no username needed). `is_admin(session_key)` checks roles against `ADMIN_ROLES` from `config.py`. Returns `False` on any error (safe default). See "Auth & Ownership Enforcement" section below.

### KVStore collections (`stage/default/collections.conf`)
- `saved_tests` — full TestDefinition + metadata. Fields include `version` (number) for optimistic locking, `createdBy` for ownership.
- `scheduled_tests` — scheduled test config + cron + recipients. Fields include `version` (number), `createdBy` for ownership.
- `test_run_history` — per-run records with status, drift detection, scenario results. Fields include `testId`, `ranBy`, `triggerType` ("scheduled" or "manual") for audit trail.

### Custom alert action
- Name: `query_tester_run_test`
- Registered in `stage/default/alert_actions.conf`
- Trigger search pattern: `| makeresults | eval test_id="{id}"` with cron schedule
- The trigger search is created programmatically by `scheduled_tests_handler.py` — never manually

### SPL sync behavior
When a scheduled test has `savedSearchOrigin` set, the alert action always fetches
the current SPL from that saved search before running. It hashes and compares to the
stored hash — sets `splDriftDetected = true` if changed. Always runs with the CURRENT
SPL, never the stored snapshot. This keeps the test in sync with the live alert automatically.

### Email recipients
Stored as `emailRecipients: string[]` on ScheduledTest. Never a single string.
If the array is empty at send time, fall back to `DEFAULT_ALERT_EMAIL` from `config.py`.
The default address is always shown as a locked row in the UI — cannot be removed.

---

## Optimistic Locking (Concurrency Protection)

Both `saved_tests` and `scheduled_tests` collections use a `version` integer field to prevent lost-update problems when multiple users edit the same record.

**Backend protocol:**
- `version` field declared as `number` in `collections.conf`. Born at `1` on POST.
- PUT handlers compare `payload["version"]` against stored `record["version"]`. Mismatch → `409 Conflict` with `{"error": "Version conflict — record was modified by another user. Please reload."}`.
- On match, version is incremented: `record["version"] = existing_version + 1`.
- **Backward compatibility:** Records with `version=0` or missing version field (pre-existing data) are treated as legacy. If the PUT payload omits `version`, the check is skipped but version is still set to `1` on the updated record. This allows gradual migration without a data backfill.

**Frontend protocol:**
- `savedTestsApi.updateTest()` forwards `version` in the PUT body.
- `testLibrarySlice.updateSavedTest()` reads `savedTestVersion` from store state, sends it, and updates the local version on success.
- `scheduledTestsSlice.updateScheduledTest()` does the same for schedule records.
- On 409 response, both slices set a user-facing error: "This test was modified by someone else — please reload before saving."
- `SavedTestMeta` and `ScheduledTest` TypeScript interfaces include `version: number`.

---

## Auth & Ownership Enforcement

### auth_utils.py — Role-based authorization
`get_current_user_roles(session_key)` calls Splunk's `authentication/current-context` REST endpoint via splunklib. This returns the roles for the session owner without needing the username — critical for SAML environments where usernames may be email/UPN format (e.g. `user@domain.com`) and `service.users[username]` lookups can fail.

`is_admin(session_key)` checks whether any of the user's roles intersect with `ADMIN_ROLES` from `config.py`. Default: `["admin", "sc_admin", "query_tester_admin"]`. Returns `False` on any exception (safe default).

**SAML consideration:** `get_username(request)` in `handler_utils.py` returns `session["user"]` — which Splunk populates from the SAML assertion. This may be an email or short name depending on IdP config. The `authentication/current-context` approach avoids this ambiguity entirely because it reads roles from the session token, not a username lookup.

**Status:** `auth_utils.is_admin(session_key)` is wired into `config_handler.py` (Setup page admin check). Ownership handlers (`saved_tests_handler.py`, `scheduled_tests_handler.py`) still use the older `is_admin_user(session_key, username)` from `handler_utils.py`. Both functions now use `splunk_connect.get_service()` for connections.

### Ownership enforcement on PUT and DELETE
Both `saved_tests_handler.py` and `scheduled_tests_handler.py` enforce ownership:
- On PUT/DELETE, the handler reads `createdBy` from the existing KVStore record.
- If `createdBy` is set and doesn't match the current session user, and `is_admin_user()` returns `False`, the handler returns `403 Forbidden` with `{"error": "Forbidden: you can only modify your own tests."}`.
- Admin users bypass ownership checks entirely.
- Records with empty `createdBy` (legacy data) allow anyone to modify.

---

## Input Validation Conventions

### saved_tests POST
- `name` — required, must be non-empty string. Missing/empty → `400` with `{"error": "Missing required field: name"}`.
- `definition` — size checked against `MAX_DEFINITION_SIZE_BYTES` (25 MB, in `config.py`). Oversized → `400` with `{"error": "Test definition exceeds maximum size..."}`. The size check runs `json.dumps(definition)` and measures byte length. Applied on both POST and PUT.
- Duplicate name check: case-insensitive match against existing saved tests. Duplicate → thrown error (not a 400 — it's a business rule in the store, not the handler).

### scheduled_tests POST
- `testId` — required. Missing → `400` with `{"error": "Missing required field: testId"}`.
- `cronSchedule` — required. Missing → `400` with `{"error": "Missing required field: cronSchedule"}`.

### General pattern
All validation errors return `{"error": "..."}` with status `400`. Required-field checks happen before any KVStore operations.

---

## Manual Run Audit Trail

`query_tester.py` writes a fire-and-forget history record after every manual test run (via the builder "Run" button). The record goes into `test_run_history` KVStore collection with:
- `scheduledTestId: null` (not triggered by a schedule)
- `testId` — from the request payload
- `ranBy` — from `session.user`
- `triggerType: "manual"` (vs `"scheduled"` for alert-action runs)
- `status`, `durationMs`, `resultSummary` — from the test result

The write is wrapped in `try/except` and logged on failure — it never affects the test response. This gives admins visibility into who ran what and when, via `| inputlookup test_run_history_lookup`.

---

## Crash Recovery — lastRunAt/lastRunStatus Fix

`alert_run_test.py` has a catch-all `except` block that updates the scheduled test record with `lastRunAt` and `lastRunStatus="error"` before writing the error history record. Without this, a crash mid-run would leave the Library page showing stale "last run" data from a previous successful run. The update is also wrapped in its own `try/except` so a KVStore failure during error handling doesn't mask the original error.

---

## KVStore Admin Visibility

`stage/default/transforms.conf` defines KVStore lookup definitions for admin inspection via `| inputlookup`:
- `saved_tests_lookup` — all fields except `definition` (large JSON blob, up to 25 MB). Admins who need the definition should use the REST API directly.
- `scheduled_tests_lookup` — all fields.
- `test_run_history_lookup` — all fields except `splSnapshot` (full SPL text, can be large).

These lookups are read-only views — the app never writes through them. They exist purely for operational visibility (debugging, auditing, capacity planning).

---

## Run History Cleanup

`stage/default/savedsearches.conf` contains `query_tester_trim_run_history` — a nightly janitor search that trims `test_run_history` to the 20 most recent runs per scheduled test. Uses `| inputlookup`, `streamstats count as row_number by scheduledTestId`, `where row_number <= 20`, `| outputlookup` to overwrite.

- **Cron:** `0 2 * * *` (02:00 daily)
- **Disabled by default** (`disabled = 1`). Must be enabled after deployment.
- **Source of truth:** `MAX_RUN_HISTORY_PER_TEST = 20` in `config.py`. If changed, the saved search `where` clause must be updated to match.
- **Advisory total cap:** `MAX_RUN_HISTORY_TOTAL = 100000` in `config.py` — not enforced, informational only.

---

## SPL Drift Warning in Builder

When a saved test is loaded via `loadTestIntoBuilder()` in `testLibrarySlice.ts`, if the test has a `savedSearchOrigin` (i.e., its SPL came from a Splunk saved search), the slice fires an async check:
1. Calls `getSavedSearchSpl(app, origin)` to fetch the current SPL from Splunk.
2. Compares (trimmed) to the stored SPL in the test definition.
3. If different → sets `splDriftWarning` to `'The saved search "X" has changed since this test was last saved.'`
4. If the saved search is not found (404 / error) → sets warning to `'The saved search "X" could not be found. It may have been deleted or renamed.'`

The check is fire-and-forget (promise `.then/.catch`) inside a synchronous function. The warning clears on dismiss (`clearSplDriftWarning()`) or on reload (`reloadDriftedSpl()` which re-fetches the SPL and updates the test's query).

**UI:** `QuerySection.tsx` renders the warning as an amber banner with "Reload SPL" button and an X dismiss button. Only shown when `splDriftWarning` is non-null.

---

## Library Page Filtering

`LibraryPage.tsx` provides client-side filtering over the `savedTests` array via the `useLibraryFilters` hook (`features/library/useLibraryFilters.ts`):
- **Search** — free-text, case-insensitive match on test `name`
- **App** — exact match on `app` field. Options derived from unique apps in saved tests.
- **Type** — matches `validationType` only (NOT `testType`). Fixed options: Standard, iJump. iJump tests have `testType: 'standard'` so filtering by `testType` would incorrectly include them under Standard.
- **Creator** — exact match on `createdBy`. Options derived from unique creators in saved tests.
- **Status** — matches `lastRunStatus` from the linked `ScheduledTest`. Options: Passed, Failed, Error, Not run yet. "Not run yet" matches tests with no schedule or no runs (`lastRunStatus === null`).

All filters combine with AND logic (all must match). Filter state and memos are encapsulated in `useLibraryFilters.ts`; presentation in `LibraryFilters.tsx`.

---

## Test Name Editing

Test name can be edited from two places:
- **Builder page** — inline input in the setup bar (compact mode) or setup card (initial mode). Uses debounced `updateTestName` (300ms) via `localName` state in `StartPage.tsx`. Name is NOT in the TopBar/TestNavigation — only in the setup area.
- **Library page → ScheduleModal** — the settings gear on each test row opens `ScheduleModal.tsx`, which includes a "Test Name" input. On save, if the name changed, it calls `updateSavedTest()` to rename. Note: `ScheduledTest.testName` is stale (set at creation) — always look up the current name from `savedTests.find()`.

## SPL Linter (Dangerous Command Detection)

`features/query/splLinter.ts` exports `lintSpl()` which detects dangerous SPL commands (`delete`, `outputlookup`, etc.). Warnings are shown as inline Ace markers + gutter annotations via `useAceMarkers` hook.

Linting triggers:
- **On editor blur** — `handleEditorBlur` in `QuerySection.tsx`
- **On external SPL change** — `useEffect([spl])` re-lints when SPL changes programmatically (e.g., saved search selection), but only when the editor is NOT focused (avoids conflicting with focus/blur clearing)
- **Cleared on editor focus** — `handleEditorFocus` clears warnings so user can edit without noise

## Extracted Hooks and Components

To keep files under 200 lines:
- `src/hooks/useLoadTest.ts` — extracted from `StartPage.tsx`. Handles loading a saved test by ID (fetches saved tests if needed, calls `loadTestIntoBuilder` + `loadLastRun`).
- `src/features/layout/SetupCard.tsx` — extracted from `StartPage.tsx`. The initial setup card shown when no app is selected (name input, app selector, test type selector).
- `src/features/library/useLibraryFilters.ts` — extracted from `LibraryPage.tsx`. All filter state (search, app, type, creator, status) + derived memos (apps, creators, filtered).

## AppShell Routing (`AppShell.tsx`)

Single-page app with hash-based routing inside the `QueryTesterApp` Splunk page:
- `#library` — Library page (default)
- `#tester` or `#tester?test_id=xxx` — Builder/tester page
- `#setup` — Admin Setup page
- **Hash takes priority over URL query params.** If `#library` is set, it navigates to library even if `?test_id=xxx` is still in the URL (e.g. from an email link). This prevents the user from being stuck on the tester page.
- Email notification links use `?test_id=xxx` (no hash) which routes to the tester on initial load.

---

## Scheduled Runner Details (`scheduled_runner.py`)

Scripted input that runs every 60 seconds via `inputs.conf`. NOT the same as `alert_run_test.py` (alert action).

**Key behaviors:**
- Re-reads fresh KVStore record before upsert after test completion — avoids clobbering user changes (e.g. user disabled the test while it was running).
- Passes `session_key` to `send_failure_emails()` so email config reads from runtime config (not static config.py).
- Checks `alertOnFailure` with explicit string comparison: `alert_flag in (True, "1", "true", "True")` — KVStore stores booleans as strings.
- SPL drift detection: compares current SPL against last passed run's snapshot.

---

## Email Configuration (`alert_email.py`)

**TLS mode auto-inference:** When `tls_mode` is not explicitly stored in KVStore (the Setup page doesn't have a TLS selector), `_infer_tls_mode()` detects it from port:
- Port 587 + password/oauth2 auth → `starttls`
- Port 465 + password/oauth2 auth → `ssl`
- Port 25 or no auth → no TLS

**Config layering:** `_get_email_config(session_key)` reads from runtime_config (KVStore → config.py fallback). Falls back to static config.py if runtime_config is unavailable.

---

## Future Considerations

### CI/CD Integration Pattern
Not yet implemented. Planned approach:
- **`runByTestId` endpoint** — run a saved test by its KVStore ID without sending the full definition. Pipeline calls the endpoint with a test ID and a service account token.
- **Placeholder string-replace convention** — dynamic test data (e.g., build number, commit hash) injected via `{{PLACEHOLDER}}` tokens in the SPL or input fields, replaced at runtime by the pipeline.
- **Role-based pipeline token** — dedicated Splunk role (e.g., `query_tester_pipeline`) with minimal permissions. Added to `ADMIN_ROLES` only if the pipeline needs to run tests owned by others.

### Remaining auth_utils.py wiring
`auth_utils.is_admin(session_key)` is used by `config_handler.py` for the Setup page admin check. `handler_utils.is_admin_user(session_key, username)` is still used by `saved_tests_handler.py` and `scheduled_tests_handler.py` for ownership checks. The plan is to swap handlers to `auth_utils.is_admin(session_key)` once validated in the SAML environment. The old function requires the username (fragile with SAML); the new one reads roles from the session token directly.

---

## Automatic Code Audit

**After every significant code change** (new files, 30+ lines added, new components,
new handlers, feature completions) — run through this checklist before finishing.
Fix all violations directly. Do not just report them.

### Frontend
- Every file under 200 lines. Single responsibility — if you need "and" to describe it, split it.
- No `any` types. Explicit return types on all exported functions.
- Props: named interface above the component, not inline.
- **React 16 only** — see BANNED APIs section above. No exceptions.
- `import create from 'zustand'` — default import. `{ create }` is v5 and will fail silently.
- New slices match the exact pattern of existing slices in `core/store/slices/`.
- No business logic in components — store actions, utils, or hooks only.
- No prop drilling beyond one level — use `useTestStore()` with selectors.
- No `console.log()` in production code.
- No commented-out code blocks.
- No magic numbers or magic strings — named constants.
- All IDs via `crypto.randomUUID()`.
- API layer: unwrap `entry[0].content`, throw typed `ApiError` on non-2xx, CSRF token on every mutating request, base URL from `config/env.ts`.
- No API calls inside components — always through store actions.
- Boolean props: `is`/`has`/`should` prefix. Handler props: `on` prefix. Handler implementations: `handle` prefix.

### Backend
- Every file under 200 lines. Single responsibility.
- **One `PersistentServerConnectionApplication` class per file** — multiple classes = "can't start the script".
- **No `print()` anywhere** — corrupts REST responses. Use `get_logger(__name__)`.
- **LF line endings** — CRLF = silent 500 on Linux.
- **Python 3.7 syntax** — no walrus, no `X | None`, no `str.removeprefix()`, no `d1 | d2` dict union, no `match/case`, no `list[x]`/`dict[x]` generics. Use `typing` module.
- All handler return values are plain `dict` or `list[dict]` — no dataclasses or custom objects.
- `restmap.conf` class names must exactly match Python class names — case-sensitive on Linux.
- KVStore collection names identical between `collections.conf` and every `kvstore_client` call.
- Every KVStore operation in `try/except`. Correct HTTP codes: 400/404/500. Never 200 with error flag.
- `alert_run_test.py` entire flow in `try/except` — always writes a `TestRunRecord` even on failure.
- `createdBy` always from session token, never request body.
- No magic strings — `ALL_CAPS` constants at module level or imported from `config.py`.
- **Splunk connections:** Use `splunk_connect.get_service(session_key)` — never raw `splunk_client.connect()` with `from config import SPLUNK_HOST, SPLUNK_PORT`. Only exceptions: `kvstore_client.py` and `config_secrets.py` (circular dependency with `runtime_config`).
- **web.conf expose entries:** Every sub-path delegated in `query_tester.py` MUST have a matching `web.conf` expose entry. Missing = 404 from Splunk web proxy.
- **KVStore booleans:** Always normalize with explicit string checks. Never use bare truthiness on KVStore values.

### Cross-stack
- `snake_case` ↔ `camelCase` translation happens only in `api/` layer. Never leaks either direction.
- Every backend endpoint → frontend API function → store action. Flag any gaps.
- All env config in `config/env.ts` (frontend) and `bin/config.py` (backend) only.
- KVStore collection names consistent across all files — grep before adding a new reference.

### Finish
```bash
# TypeScript check
npx tsc --noEmit        # zero errors required

# Build check  
yarn build              # must complete clean

# Python syntax check (use `py` on Windows — `python` triggers Microsoft Store stub)
py -m py_compile stage/bin/<new_file>.py

# Backend tests (from stage/bin/)
cd packages/query-tester/stage/bin && py -m pytest tests/ -v

# If py_compile fails, manually verify each new Python file by checking:
# 1. No syntax highlighted errors in the file
# 2. grep -n "print(" stage/bin/*.py  → must return nothing
# 3. grep -rn " | None" stage/bin/*.py → must return nothing (use Optional[X])
# 4. grep -rn ":= " stage/bin/*.py → must return nothing (no walrus)
# 5. grep -rn "def .*\blist\[" stage/bin/*.py → must return nothing
# Do NOT skip these checks and do NOT say "manually verified" without running them.
```
