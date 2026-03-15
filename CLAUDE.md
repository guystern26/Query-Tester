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
