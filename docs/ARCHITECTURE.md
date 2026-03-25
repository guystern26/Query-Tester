# Architecture Reference

## Build System

**Monorepo** with Yarn Workspaces containing two packages:

| Package | Purpose | Build tool |
|---------|---------|------------|
| `packages/query-tester-app` | React component library (`@splunk/query-tester-app`) | Built via parent webpack |
| `packages/query-tester` | Splunk app wrapper + Python backend | Webpack 5 |

**Commands:**
- `yarn run setup` -- install deps + build all (first time)
- `yarn dev` -- Vite 4.5 dev server on port 3000, proxies `/splunkd` to `localhost:8000`
- `yarn build` -- build all packages
- `cd packages/query-tester && ./node_modules/.bin/webpack --mode=production` -- build Splunk bundle only
- `yarn workspace @splunk/query-tester run link:app` -- symlink `stage/` to `$SPLUNK_HOME/etc/apps/query-tester`

**Output:** Webpack builds frontend into `stage/appserver/static/pages/`.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 16.13.1, Zustand v4.5, TypeScript 5.2, Tailwind CSS 3 |
| UI framework | `@splunk/react-ui` (Button, Card, Modal, Select, etc.) |
| Backend | Python 3.7 (bundled splunklib, no pip) |
| Dev tooling | Node 18.12, Vite 4.5 (dev only), Webpack 5 (production) |
| Styling | Tailwind 3 utility classes; styled-components v5 for `common/` wrappers only |

## Frontend Architecture

### Routing

`AppShell.tsx` -- hash-based SPA router:
- `#library` -- LibraryPage (default/landing)
- `#tester` or `#tester?test_id=xxx` -- StartPage (test builder)
- `#setup` -- SetupPage (admin config)

Hash takes priority over URL query params. Email links use `?test_id=xxx` (no hash).

### Store

Single Zustand v4 store with Immer middleware at `src/core/store/testStore.ts`.

**13 slices** in `src/core/store/slices/`:

| Slice | Responsibility |
|-------|---------------|
| `testSlice` | CRUD tests |
| `scenarioSlice` | Scenario management |
| `inputSlice` | Input/event management |
| `querySlice` | SPL query state |
| `validationSlice` | Validation conditions |
| `generatorSlice` | Event generator config |
| `runSlice` | Test execution state |
| `fileSlice` | Import/export JSON |
| `testLibrarySlice` | Saved test CRUD, library browsing |
| `scheduledTestsSlice` | Schedule records, run history |
| `testLoaderSlice` | Load test into builder |
| `configSlice` | App config (setup page) |
| `commandPolicySlice` | SPL command allow/block lists |

Support files: `helpers.ts` (shared lookups), `selectors.ts` (derived state), `configTypes.ts`, `testLibraryTypes.ts`.

Root-level state additions: `savedTestId`, `savedTestVersion`, `hasUnsavedChanges`, `splDriftWarning`.

### API Layer

`src/api/` -- all REST calls. snake_case/camelCase translation happens only here.

| File | Purpose |
|------|---------|
| `splunkApi.ts` | Splunk saved searches, apps |
| `testApi.ts` | Run tests via POST /data/tester |
| `savedTestsApi.ts` | Saved test CRUD |
| `scheduledTestsApi.ts` | Schedule CRUD + run history |
| `configApi.ts` | Setup page config |
| `configApiMappers.ts` | Config field mapping |
| `llmApi.ts` | LLM integration |

### Features

10 feature modules in `src/features/`:
`eventGenerator`, `layout`, `library`, `query`, `results`, `scenarios`, `setup`, `suites`, `tutorial`, `validation`

### Types

`src/core/types/`: `base.ts`, `config.ts`, `generator.ts`, `results.ts`

**Data hierarchy:** Test -> Scenario[] -> TestInput[] -> InputEvent[] -> FieldValue[]

**Input modes:** `'json' | 'fields' | 'no_events' | 'query_data'`

## Backend Architecture

### REST Entry Point

`query_tester.py` handles `POST /data/tester`, delegates sub-paths:
- `/data/tester/config/*` -> `config_handler.py`
- `/data/tester/command_policy/*` -> `command_policy_handler.py`

Separate handler files (each with one `PersistentServerConnectionApplication`):
- `saved_tests_handler.py` -- `/data/saved_tests`
- `scheduled_tests_handler.py` -- `/data/scheduled_tests`
- `run_history_handler.py` -- `/data/test_run_history`
- `bug_report_handler.py` -- `/data/bug_report`

### Test Execution Data Flow

```
parse payload -> analyze SPL -> per scenario:
  generate events -> index via HEC -> inject SPL -> execute query -> validate -> cleanup (in finally)
```

Orchestrated by `core/test_runner.py`. Per-scenario errors don't stop the loop.

### Module Map

| Directory | Modules | Responsibility |
|-----------|---------|---------------|
| `core/` | `test_runner`, `payload_parser`, `response_builder`, `helpers`, `models`, `validation_parser`, `validation_parser_helpers` | Orchestration, parsing, serialization |
| `spl/` | `spl_analyzer`, `spl_analyzer_rules`, `query_injector`, `query_executor`, `spl_normalizer`, `preflight` | SPL analysis, rewriting, execution |
| `data/` | `data_indexer`, `lookup_manager`, `sub_query_runner` | HEC indexing, CSV lookups, sub-queries |
| `generators/` | `event_generator`, `config_parser`, + per-type modules | Event generation (no I/O) |
| `validation/` | `result_validator`, `condition_handlers`, `scope_evaluator` | Result comparison (no queries) |

Top-level handler/utility modules:
`auth_utils`, `handler_utils`, `kvstore_client`, `splunk_connect`, `runtime_config`, `config_secrets`, `config_detection`, `config_test_connectivity`, `logger`, `cron_matcher`, `spl_drift`, `alert_email`, `alert_email_html`, `alert_helpers`, `alert_run_test`, `scheduled_runner`, `scheduled_runner_helpers`, `scheduled_search_manager`, `deprecation`

### Config Stack

```
config.py (static defaults)
  -> runtime_config.py (KVStore override, 120s TTL cache)
    -> config_secrets.py (storage/passwords for tokens/passwords)
```

### Connections

`splunk_connect.get_service(session_key)` -- always connects to localhost. All modules use this.

**Exceptions** (circular dependency): `kvstore_client.py`, `config_secrets.py` use static config directly.

### KVStore Collections

| Collection | Purpose |
|-----------|---------|
| `saved_tests` | Full TestDefinition + metadata (version, createdBy) |
| `scheduled_tests` | Cron config, status, email recipients |
| `test_run_history` | Per-run records (trimmed to 20/test nightly) |
| `query_tester_config` | Admin settings (key: "main") |

Secrets stored in `storage/passwords` (HEC token, SMTP password, LLM key).

### Scheduled Execution

Two paths:
1. **Alert action** (`alert_run_test.py`): Splunk saved search fires on cron -> alert action
2. **Scripted input** (`scheduled_runner.py`): Runs every 60s via `inputs.conf`, checks cron matches

## Deployment

### Dev
Symlink `stage/` to `$SPLUNK_HOME/etc/apps/query-tester`. Python changes need Splunk restart only. Frontend changes need webpack rebuild + restart.

### Production -- Three Apps

| App | Deploy to | Purpose |
|-----|-----------|---------|
| `query-tester/` | Search head (`etc/apps/`) | UI, REST handlers, KVStore |
| `query-tester-indexer/` | Indexers (`etc/master-apps/`) | `temp_query_tester` index |
| `query-tester-fwd/` | Heavy forwarder (`etc/deployment-apps/`) | HEC token |

Build: `packages/query-tester/build-release.sh`

**IMPORTANT:** `stage/default/` conf files are overwritten by webpack (CopyWebpackPlugin). Always edit the **source** at `src/main/resources/splunk/default/`.

## Key Patterns

- One `PersistentServerConnectionApplication` per handler file
- No `print()` -- use `get_logger(__name__)` from `logger.py`
- LF line endings only (CRLF = 500 on Linux)
- `from __future__ import annotations` in every `.py` file
- Registries (`GENERATOR_REGISTRY`, `CONDITION_HANDLERS`) not if/elif chains
- Cleanup always in `finally`
- `createdBy` from session token, never request body
- Optimistic locking via `version` field on saved_tests and scheduled_tests
- KVStore booleans stored as strings -- always normalize explicitly
- Every REST sub-path needs a matching `web.conf` expose entry
