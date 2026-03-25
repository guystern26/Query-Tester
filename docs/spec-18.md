# spec-18 — API Layer

## Conventions

- All API calls go through typed functions in `src/api/`
- Base URL from `config/env.ts` `REST_PATH`, constructed via `@splunk/splunk-utils/url`
- CSRF token via `@splunk/splunk-utils/fetch` on every mutating request (POST/PUT/DELETE)
- Response unwrapping: `data.entry[0].content` for Splunk REST format
- Typed `ApiError` with HTTP status code thrown on non-2xx responses
- No API calls inside components — always through store actions

## Endpoints

| Module | Method | Path | Purpose |
|--------|--------|------|---------|
| testApi | POST | `data/tester` | Run test |
| savedTestsApi | GET | `data/saved_tests` | List saved tests |
| savedTestsApi | GET | `data/saved_tests/{id}` | Get saved test |
| savedTestsApi | POST | `data/saved_tests` | Create saved test |
| savedTestsApi | PUT | `data/saved_tests/{id}` | Update saved test |
| savedTestsApi | DELETE | `data/saved_tests/{id}` | Delete saved test |
| scheduledTestsApi | GET | `data/scheduled_tests` | List scheduled tests |
| scheduledTestsApi | POST | `data/scheduled_tests` | Create schedule |
| scheduledTestsApi | PUT | `data/scheduled_tests/{id}` | Update schedule |
| scheduledTestsApi | DELETE | `data/scheduled_tests/{id}` | Delete schedule |
| scheduledTestsApi | GET | `data/test_run_history?test_id={id}` | Get run history |
| configApi | GET | `data/tester/config` | Get config |
| configApi | POST | `data/tester/config` | Save config |
| configApi | GET | `data/tester/config/status` | Config status |
| configApi | GET | `data/tester/config/secret/{name}` | Get secret |
| configApi | POST | `data/tester/config/test` | Test connectivity |
| configApi | GET | `data/tester/config/email/detect` | Auto-detect email |
| configApi | GET/POST/DELETE | `data/tester/command_policy` | Command policy CRUD |
| splunkApi | GET | `services/apps/local` | List Splunk apps |
| splunkApi | GET | `servicesNS/.../saved/searches` | Saved searches |

## Module Notes

### savedTestsApi

- `listSavedTests()` returns `SavedTestMeta[]` (no definition body)
- `getSavedTest(id)` returns `SavedTestFull` (includes full definition)
- `updateTest()` sends `version` in PUT body for optimistic locking

### scheduledTestsApi

- `normalizeScheduledTest()` — converts KVStore boolean strings (`"0"`, `"1"`)
  to proper booleans. Applied on every GET response as a safety net.
- All list/get responses pass through normalization before reaching the store.

### configApi

- Config endpoints use the `/data/tester/config/*` sub-path structure
- Command policy uses `/data/tester/command_policy/*`
- Both require matching `web.conf` expose entries

### splunkApi

- `getApps()` — fetches from `services/apps/local`, filters visible apps
- `getSavedSearches(app)` — fetches from `servicesNS/-/-/saved/searches`
- `getSavedSearchSpl(app, name)` — gets SPL text for a specific saved search
