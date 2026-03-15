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
- `query_tester.py` — REST handler entry point (Splunk wiring only)
- `core/test_runner.py` — orchestrator, loops scenarios
- `core/payload_parser.py` — JSON dict -> dataclasses (camelCase -> snake_case)
- `core/response_builder.py` — serializes results to camelCase JSON for frontend
- `core/helpers.py` — shared utilities
- `spl/spl_analyzer.py` — reads SPL only, never modifies
- `spl/query_injector.py` — rewrites SPL, never runs it
- `spl/query_executor.py` — executes SPL via splunklib
- `spl/spl_normalizer.py` — SPL preprocessing before analysis
- `data/data_indexer.py` — indexes events, cleanup
- `data/lookup_manager.py` — temp CSV lookup create/delete
- `data/sub_query_runner.py` — executes sub-queries for data inputs
- `generators/event_generator.py` — expands GeneratorConfig, no file I/O or Splunk calls
- `generators/` — per-type modules: numbered.py, pick_list.py, email.py, ip_address.py, unique_id.py, random_number.py, general_field.py
- `validation/result_validator.py` — compares rows to conditions, never runs queries
- `validation/condition_handlers.py` — registry of condition evaluation functions

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

### File responsibilities (never cross these)
- `spl_analyzer.py` reads SPL only — never modifies it
- `query_injector.py` rewrites SPL — never runs it
- `result_validator.py` compares rows to conditions — never runs queries
- `event_generator.py` expands GeneratorConfig — no file I/O, no Splunk calls

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
- **Config files:** `stage/bin/config.py` (backend), `src/config/env.ts` (frontend)
- See `DEPLOYMENT.md` for full deployment guide

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

### New backend modules (`stage/bin/`)
Following the same strict boundary rules as existing modules:
- `saved_tests_handler.py` — REST handler for `/data/saved_tests`. CRUD for saved tests in KVStore. Reads `createdBy` from session token — never from request body.
- `scheduled_tests_handler.py` — REST handler for `/data/scheduled_tests`. Creates/updates/deletes both the KVStore record AND the backing Splunk saved search.
- `run_history_handler.py` — REST handler for `/data/test_run_history`. Returns last 50 run records sorted by ranAt desc.
- `alert_run_test.py` — Custom alert action entry point. Orchestration only — reads test_id, fetches test, checks SPL drift, runs test, writes result. No business logic.
- `alert_email.py` — Email formatting and sending only. Uses smtplib, host=CASNLB, port=25, no TLS.
- `kvstore_client.py` — Raw KVStore CRUD only. No business logic. Methods: get_all, get_by_id, upsert, delete. Returns plain dicts only.
- `handler_utils.py` — Shared handler utilities (session username reading, error response building). Imported by handlers — never a handler itself.

### KVStore collections (`stage/default/collections.conf`)
- `saved_tests` — full TestDefinition + metadata
- `scheduled_tests` — scheduled test config + cron + recipients
- `test_run_history` — per-run records with status, drift detection, scenario results

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

# Python syntax check — no local Python available on this machine.
# Use this workaround instead:
# Python syntax check
python -m py_compile stage/bin/<new_file>.py

# If the above fails, manually verify each new Python file by checking:
# 1. No syntax highlighted errors in the file
# 2. grep -n "print(" stage/bin/*.py  → must return nothing
# 3. grep -rn " | None" stage/bin/*.py → must return nothing (use Optional[X])
# 4. grep -rn ":= " stage/bin/*.py → must return nothing (no walrus)
# 5. grep -rn "def .*\blist\[" stage/bin/*.py → must return nothing
# Do NOT skip these checks and do NOT say "manually verified" without running them.
```
