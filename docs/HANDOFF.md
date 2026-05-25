# Query Tester — Developer Handoff

This is the single source of truth for the project. CLAUDE.md in the repo root has the strict coding rules — read both.

## What this is

A Splunk app that lets you test SPL queries with synthetic data. You define inputs (events with fields), the app indexes them to a temp index, rewrites your SPL to query that temp index, runs it, and validates the results against your conditions. Two product surfaces:

- **Builder/Library** — UI for creating, saving, and scheduling tests (`#tester`, `#library`, `#setup`)
- **SPL IDE** — standalone SPL editor with AI analysis (`#spl-ide`)

Plus three add-ons:
- **`| aiguy`** custom search command — AI in SPL pipelines (10+ modes: summary, anomaly, enrich, extract, explain, suggest, dashboard, etc.)
- **AI Summary alert action** — AI-generated email summaries for any saved search alert
- **Monitoring dashboard** — usage stats, run history, error tracking

## Repo layout

```
packages/query-tester-app/   React frontend library (Zustand v4, Tailwind 3, React 16.13)
  src/StartPage.tsx          builder entry point
  src/AppShell.tsx           hash-based routing (#library #tester #setup #spl-ide)
  src/features/              feature modules: query, scenarios, validation, results, library, suites, setup, ide
  src/core/store/            Zustand store (8 slices + helpers + selectors)
  src/api/                   API layer: splunkApi, testApi, llmApi, ideApi, savedTestsApi
  src/utils/payloadBuilder.ts  serializes TestDefinition → backend payload

packages/query-tester/       Splunk app wrapper
  stage/                     deployed Splunk app dir (symlink to $SPLUNK_HOME/etc/apps/query-tester)
  stage/bin/                 Python REST handlers + business logic
  stage/bin/aiguy/           | aiguy custom command (SOLID split into 7 modules)
  stage/bin/ai_guy.py        | aiguy entry point (uses splunklib chunked protocol)
  stage/bin/scheduling/      scheduled test runner + helpers
  stage/default/             Splunk conf files
  src/main/resources/splunk/default/  webpack source for conf files (must mirror stage/default)
```

## Key architecture rules (see CLAUDE.md for the full list)

- **React 16.13.1** — no `createRoot`, no `useId`, no `useTransition`, no `React.lazy` for data fetching
- **Zustand v4** — `import create from 'zustand'` (default import, not named)
- **Tailwind 3** — `@tailwind` directives, not `@import "tailwindcss"` (v4 syntax)
- **Python 3.7** on Splunk — no walrus, no `X | None` (use `Optional[X]`), no `list[x]`/`dict[x]` generics
- **No print() in Python** — corrupts REST responses, use `get_logger(__name__)`
- **LF line endings** — CRLF causes a 500 on Linux Splunk
- **Files under 200 lines** — split when growing past that
- **camelCase ↔ snake_case translation in `api/` layer only** — never leaks either direction
- **Webpack overwrites `stage/default/`** — edit `src/main/resources/splunk/default/` and copy

## Critical pipeline knowledge

**Manual test run:**
Frontend → `payloadBuilder.ts` (camelCase to backend keys) → POST `/data/tester` → `query_tester.py` → `test_runner.py` → `payload_parser.py` → run scenarios

**Scheduled test run:**
KVStore (frontend-format JSON) → `scheduled_runner.py` → `scheduled_runner_helpers.build_test_payload()` → must normalize generator rules, queryDataConfig.timeRange, event format → `test_runner.py` → same as manual from there

The scheduled path has historically diverged from the manual path because manual converts in JS and scheduled converts in Python. Test both whenever you touch the payload structure.

## SPL injection strategies (`stage/bin/spl/query_injector.py`)

Detected by `detect_strategy()`, dispatched via `STRATEGY_HANDLERS`:
- `standard` — replace `index=X` clause with temp index
- `inputlookup` — replace `| inputlookup foo` clause
- `lookup` — swap lookup name with temp lookup
- `rest` — replace `| rest ...` clause
- `savedsearch` — replace `| savedsearch "name"` (handles quoted names with pipes)
- `tstats` — noop, rely on RI matching
- `no_index` — prepend `index=temp ...` (last resort)

## | aiguy custom command

Splunk streaming command. `chunked=true` + splunklib. Needs `python.version = python3` in `commands.conf`. All users with `run_custom_command` capability can run it.

LLM config in `config.py`: `LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL`. **Never commit config.py** — it has secrets.

Modes:
- Analysis: `summary`, `anomaly`, `trend`, `compare`, `alert`, `health`, `top` — one LLM call, one row out
- `extract` — AI regex with dict fallback, per-row new field
- `enrich` — per-row labeling, batched LLM calls, deadline-aware
- `explain` — explain the SPL query
- `suggest` — suggest a follow-up SPL query
- `dashboard` — fetch all panels of a dashboard and summarize

25s total deadline. Returns partial results if exceeded. Persistent HTTPS connection across batches.

## Test files to know

- `bin/tests/test_aiguy_extract.py` — 29 aiguy tests
- `bin/tests/test_savedsearch_injection.py` — 18 savedsearch tests
- `bin/tests/test_scheduled_generator.py` — 29 scheduled pipeline tests (this is the safety net for the camelCase/snake_case bugs)
- `bin/tests/test_injector_cases.py` — injection regression
- Run all: `cd packages/query-tester/stage/bin && py -m pytest tests/ --ignore=tests/test_cache_kvstore_live.py`

## Deployment

**Dev:** symlink `stage` to `$SPLUNK_HOME/etc/apps/query-tester`. Python changes need Splunk restart. JS changes need browser hard refresh (Ctrl+Shift+R).

**Two git remotes:**
- `origin` — dev repo with full history (`Query-Tester`)
- `clean` — deploy repo, orphan-pushed with sanitized `config.py` (`QueryTester4Ever`)

Push to **origin** normally: `git add ...`, `git commit -m "..."`, `git push origin main`.

Push to **clean** (orphan, sanitized, force-push). Run this single command — it clones the clean repo to a temp dir, copies just `stage/`, strips secrets, and force-pushes:

```bash
TEMP_DIR=$(mktemp -d) && cd "$TEMP_DIR" && \
  git clone --depth 1 https://github.com/guystern26/QueryTester4Ever.git clean-repo && \
  cd clean-repo && \
  git checkout --orphan fresh-push && \
  git rm -rf . > /dev/null 2>&1 ; \
  cp -r <REPO_PATH>/packages/query-tester/stage/* . && \
  rm -rf bin/.aiguy_cache bin/__pycache__ bin/email_preview_success.html && \
  sed -i 's/LLM_API_KEY = ".*"/LLM_API_KEY = ""/' bin/config.py && \
  sed -i 's/LLM_ENDPOINT = ".*"/LLM_ENDPOINT = ""/' bin/config.py && \
  sed -i 's/SPLUNK_PASSWORD = ".*"/SPLUNK_PASSWORD = ""/' bin/config.py && \
  git add -A && git commit -m "deploy" && \
  git push --force origin fresh-push:main && \
  cd / && rm -rf "$TEMP_DIR"
```

Replace `<REPO_PATH>` with your local repo path. Clean repo only contains the Splunk app `stage/` contents — no docs, no source code, no git history. Used to deploy to the prod Splunk server.

## Known live deltas / things to watch

- **`config.py`** stays local — `LLM_API_KEY`, `LLM_ENDPOINT`, `SPLUNK_PASSWORD` must never reach a public repo. The clean-repo push sanitizes them, but `origin` shouldn't see them either (they're not gitignored — be careful)
- **Auto memory** at `C:\Users\guyst\.claude\projects\...\memory\` — read MEMORY.md before working
- **Webpack source duplication** — `commands.conf`, `searchbnf.conf`, `monitoring.xml` exist in both `stage/default/` and `src/main/resources/splunk/default/`. Edit both, or webpack will overwrite your stage edits

## When something doesn't work

1. **Frontend changes not appearing** — webpack didn't rebuild OR browser cache. Run webpack, hard refresh.
2. **Python changes not appearing** — Splunk needs restart. Or you edited `stage/default/` and webpack overwrote it.
3. **Scheduled test crashes but manual works** — camelCase/snake_case mismatch in `scheduled_runner_helpers.py`. Add normalization there.
4. **`| aiguy` slow** — check `aiguy_timing` field. If many LLM calls, increase `ENRICH_BATCH_CHARS`. If single slow call, the model/network is the bottleneck.
5. **iJump / standard modes silently wrong** — check `payloadBuilder.ts`. Both modes share `fieldGroups` structure. Validation stash in `validationSlice.ts` keeps them separate in the UI.

## Where to look for more

- `CLAUDE.md` (repo root) — strict coding rules, all the gotchas
- `docs/ARCHITECTURE.md` — high-level diagram
- Recent commits — every bug fix has a message explaining the root cause
