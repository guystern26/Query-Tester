# CLAUDE.md

Strict rules for this repo. For architecture and pipeline knowledge, read `docs/HANDOFF.md`.

## Build & Dev Commands

```bash
yarn run setup            # one-time install + build all packages
yarn dev                  # Vite dev server, proxies /splunkd to localhost:8000
yarn build                # build all packages
cd packages/query-tester && ./node_modules/.bin/webpack --mode=production  # Splunk bundle
yarn lint
yarn test                                           # all packages
yarn workspace @splunk/query-tester-app run test   # single package
cd packages/query-tester/stage/bin && py -m pytest tests/  # backend tests (Windows: py, Linux: python3)
yarn format               # auto-format
yarn workspace @splunk/query-tester run link:app   # symlink stage to Splunk
```

## Frontend Rules (React 16.13.1, Zustand v4, Tailwind 3)

### Banned React 16 APIs
NEVER use: `createRoot`, `hydrateRoot`, `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`, `useInsertionEffect`, `React.lazy` for data fetching, `startTransition`, automatic batching in promises/timeouts, `flushSync`, `<StrictMode>` double-render behavior. `createPortal`, `forwardRef`, `React.memo`, `useCallback`, `useMemo`, `useRef`, `useState`, `useEffect`, `useContext` are fine.

### Zustand v4
```ts
import create from 'zustand';     // CORRECT (default)
import { create } from 'zustand'; // WRONG (v5 syntax)
```

### Tailwind 3
- `@tailwind base; @tailwind components; @tailwind utilities;` in CSS
- NOT `@import "tailwindcss"` (v4 syntax)
- `darkMode: 'class'` (not v4's `'selector'`)

### Code style
- Prettier: `tabWidth: 4` (TS/TSX/CSS), `tabWidth: 2` (JSON), `singleQuote: true`, `printWidth: 100`
- JSX runtime: `classic` (React 16 requirement)
- All IDs via `crypto.randomUUID()`
- No `any`. Explicit return types on exported functions. Props as named interface.
- No `console.log()`, no commented-out code, no magic numbers/strings
- No business logic in components. No API calls in components. No prop drilling beyond one level — use `useTestStore()` with selectors.
- Boolean props: `is`/`has`/`should` prefix. Handlers: `onX` prop, `handleX` impl.

### Color palette (locked)
- App bg `rgb(22,32,51)` / `navy-900` / `#162033`
- Card bg `rgb(32,43,67)` / `navy-800` / `#202b43`
- Nested cards `#162033` / `navy-900`
- Elevated/selected `#2a3a5c` / `navy-700`
- Primary buttons `bg-blue-300 text-slate-900`
- Save Test green `bg-green-500`. AI buttons `border-slate-600 text-blue-300`.
- Text: primary `text-slate-200`, secondary `text-slate-400`, muted `text-slate-500`
- Borders `border-slate-700`. Focus `focus:border-blue-300 focus:ring-blue-300/20`
- NO cyan, sky, or indigo anywhere.

### UI Framework
- `@splunk/react-ui` for primitives. NEVER `@mui/*`.
- Wrap app in SplunkThemeProvider family=enterprise colorScheme=dark density=comfortable.

### styled-components v5
- common/ wrappers only. New components use Tailwind. Never mix on the same element.

### Node 18.12 / Vite 4.5.x
- No `using` keyword, no `import.meta.dirname`, no top-level await.

## Backend Rules (Python 3.7 on Splunk)

- No walrus `:=`. No `X | None` (use `Optional[X]`). No `list[x]`/`dict[x]` generics — use `typing.List`/`Dict`.
- No `str.removeprefix()`, no `d1 | d2` dict union, no `match/case`.
- `from __future__ import annotations` at the top of every file.
- **No `print()` anywhere** — corrupts REST responses. Use `get_logger(__name__)`.
- **LF line endings only** — CRLF causes a silent 500 on Linux Splunk.
- No external packages. Stdlib + bundled `splunklib/` only.
- One `PersistentServerConnectionApplication` class per file.
- Handler return values are plain `dict`/`list[dict]`. No dataclasses or custom objects. No `dataclasses.asdict()` (gives snake_case).
- `restmap.conf` class names exactly match Python class names (case-sensitive on Linux).
- Every KVStore op in try/except. HTTP codes: 400/404/500. Never 200 with error flag.
- `alert_run_test.py` entire flow in try/except — always write a `TestRunRecord` even on failure.
- `createdBy` from session token, never request body.
- Magic strings → ALL_CAPS module constants or imports from `config.py`.

### Splunk connections
- Use `splunk_connect.get_service(session_key)` — never raw `splunk_client.connect()`. Exceptions: `kvstore_client.py` and `config_secrets.py` (circular dependency with `runtime_config`).
- `splunk_connect.py` always connects to localhost via static `config.py`. Don't change this.

### web.conf expose
Every sub-path delegated in `query_tester.py` MUST have a matching `[expose:...]` entry in `web.conf`. Missing = 404 from Splunk web proxy even though splunkd handles it.

### KVStore booleans
KVStore stores booleans as `"0"`/`"1"` strings. JS `"0"` is truthy. Always normalize with explicit string checks: `flag in (True, "1", "true", "True")`. Both backend (`scheduled_tests_handler._normalize_bools`) and frontend (`normalizeScheduledTest`) handle this.

### SPL data embedding
Single quotes break silently in Splunk eval. Use JSON via `eval _raw=` with double-quote escaping.

### Splunk REST response
```python
data = response.json()
content = data['entry'][0]['content']  # nested, not at root
```

## Cross-stack

- `snake_case` ↔ `camelCase` translation only in `api/` layer (frontend) and `payload_parser.py` (backend). Never leak either direction.
- Every backend endpoint → frontend API function → store action. Flag gaps.
- KVStore collection names identical across `collections.conf` + every `kvstore_client` call.
- All env config in `config/env.ts` (frontend) and `bin/config.py` (backend). Never elsewhere.

## File responsibilities (never cross)

- `spl_analyzer.py` reads SPL — never modifies
- `query_injector.py` rewrites SPL — never runs
- `result_validator.py` compares rows to conditions — never runs queries
- `event_generator.py` expands GeneratorConfig — no file I/O, no Splunk calls

## Webpack source duplication

`stage/default/` is overwritten on every webpack build (CopyWebpackPlugin from `src/main/resources/splunk/default/`). Always edit the source at `src/main/resources/splunk/default/`, not `stage/default/` directly. Currently synced: `commands.conf`, `searchbnf.conf`, `monitoring.xml`.

## File size limit

Every file under 200 lines. Single responsibility — if you need "and" to describe it, split it.

## After every change — Automatic Audit

Frontend: `npx tsc --noEmit` (zero errors), `yarn build` (clean), no banned APIs.
Backend: `py -m py_compile <new_file>.py`, run tests, grep for forbidden patterns:
```bash
grep -rn "print(" stage/bin/*.py    # must return nothing
grep -rn " | None" stage/bin/*.py   # must return nothing (use Optional[X])
grep -rn ":= " stage/bin/*.py       # must return nothing (no walrus)
```

Don't say "manually verified" without running these.
