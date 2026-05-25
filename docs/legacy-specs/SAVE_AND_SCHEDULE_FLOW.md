# Save & Schedule Flow -- End-to-End

## Save Flow

1. User clicks Save in builder toolbar.
2. **New test:** `SaveTestModal` opens -- user enters name + description. Calls `savedTestsApi.createTest()` -> `POST /data/saved_tests`.
3. **Existing test:** Calls `savedTestsApi.updateTest(id, name, desc, definition, version)` -> `PUT /data/saved_tests/{id}`.
4. **Backend** (`saved_tests_handler.py`):
   - Validates `name` is non-empty (400 if missing).
   - Checks `definition` size against `MAX_DEFINITION_SIZE_BYTES` (25 MB).
   - On PUT: checks ownership (`createdBy` vs session user, admins bypass).
   - On PUT: checks `version` field against stored record. Mismatch -> `409 Conflict`.
   - Upserts to `saved_tests` KVStore collection. Sets `createdBy` from session token.
   - Increments `version` on success.
5. **On success:** Store updates `savedTestId`, `savedTestVersion`, sets `hasUnsavedChanges = false`.
6. **On 409:** Error message: "This test was modified by someone else -- please reload before saving."

## Load Flow

1. **Library page:** User clicks a test row -> `navigateTo('tester?test_id=xxx')`.
2. **AppShell:** Hash routing sends to StartPage with `loadTestId` from URL.
3. **`useLoadTest` hook** (`src/hooks/useLoadTest.ts`):
   - Fetches saved tests list if not already loaded.
   - Finds the test by ID, calls `loadTestIntoBuilder()` from `testLoaderSlice`.
   - Calls `loadLastRun()` to fetch most recent run history for the test.
4. **`loadTestIntoBuilder()`:**
   - Populates `tests[]` from saved definition.
   - Sets `activeTestId` to first test.
   - Sets `savedTestId` and `savedTestVersion` from the saved record.
5. **SPL drift check:** If the test has `savedSearchOrigin`:
   - Async: fetches current SPL from the Splunk saved search.
   - Compares (trimmed) to stored SPL.
   - If different -> sets `splDriftWarning` with message.
   - If saved search not found (404) -> sets warning about deletion/rename.
   - Fire-and-forget (`.then/.catch`), never blocks load.

## Schedule Flow

1. **Library page:** User clicks gear icon on a test row -> `ScheduleModal` opens.
2. User configures: cron expression, enable/disable toggle, alert on failure, email recipients.
3. **Create:** `scheduledTestsApi.createScheduledTest()` -> `POST /data/scheduled_tests`.
4. **Update:** `scheduledTestsApi.updateScheduledTest()` -> `PUT /data/scheduled_tests/{id}` (includes `version` for optimistic locking).
5. **Backend** (`scheduled_tests_handler.py`):
   - Validates `testId` and `cronSchedule` are present (400 if missing).
   - Creates/updates KVStore record in `scheduled_tests`.
   - Creates/updates backing Splunk saved search via `scheduled_search_manager.py`.
   - Saved search trigger: `| makeresults | eval test_id="{id}"` with cron schedule.
   - Sets `createdBy` from session token on create.

## Alert Action Flow (`alert_run_test.py`)

1. Splunk fires the saved search on cron schedule.
2. Alert action `query_tester_run_test` triggers.
3. Reads `test_id` from search results.
4. Fetches saved test definition from `saved_tests` KVStore.
5. SPL drift detection: compares current SPL against last passed run's snapshot hash. Sets `splDriftDetected = true` if changed. Always runs with current SPL.
6. Runs test via `TestRunner` (same flow as manual runs).
7. Writes `TestRunRecord` to `test_run_history` KVStore.
8. If failed + `alertOnFailure` enabled: sends email via `alert_email.py`.
9. Updates scheduled test record: `lastRunAt`, `lastRunStatus`.
10. **Crash recovery:** Catch-all `except` block updates `lastRunStatus = "error"` and writes error history record before re-raising. Both wrapped in their own try/except.

## Scheduled Runner Flow (`scheduled_runner.py`)

1. Runs every 60 seconds via `inputs.conf` scripted input.
2. Fetches all scheduled test records from `scheduled_tests` KVStore.
3. For each enabled test: checks `cron_matches(cronSchedule, now)` via `cron_matcher.py`.
4. If due: fetches test definition from `saved_tests`, builds payload (flattens InputEvent format).
5. Runs test via `TestRunner`.
6. **Re-reads fresh KVStore record** before upsert -- avoids clobbering user changes made while test was running.
7. Writes history record to `test_run_history`.
8. If failed + `alertOnFailure`: sends failure emails.
9. `alertOnFailure` check uses explicit string comparison: `alert_flag in (True, "1", "true", "True")` -- KVStore stores booleans as strings.

## Manual Run Audit Trail

`query_tester.py` writes a fire-and-forget history record after every manual test run:
- `scheduledTestId: null` (not triggered by a schedule)
- `triggerType: "manual"` (vs `"scheduled"`)
- `ranBy` from `session.user`
- Write failure is logged but never affects the test response.

## Email Alert Flow

1. `send_failure_emails()` in `alert_email.py`.
2. Builds HTML email via `alert_email_html.py` (Outlook-compatible table layout).
3. Attaches test definition as importable JSON (version 2 format).
4. URL construction: auto-builds from `splunk_host` when `splunk_web_url` is localhost.
5. Single email to all recipients (comma-separated `To:` header, case-insensitive dedup).
6. SMTP config from `runtime_config` (KVStore -> `config.py` fallback).
7. **TLS auto-inference** (`_infer_tls_mode()`):
   - Port 587 + password/oauth2 auth -> STARTTLS
   - Port 465 + password/oauth2 auth -> SSL
   - Port 25 or no auth -> no TLS

## Data Storage Summary

| Store | Collection/Location | Content |
|-------|-------------------|---------|
| KVStore | `saved_tests` | Full TestDefinition + metadata (version, createdBy) |
| KVStore | `scheduled_tests` | Cron config, status, email recipients (version, createdBy) |
| KVStore | `test_run_history` | Per-run records: status, duration, drift, scenario results |
| KVStore | `query_tester_config` | Admin settings (single record, key: "main") |
| storage/passwords | `query_tester:*` | HEC token, SMTP password, LLM API key |

### Run History Cleanup

`savedsearches.conf` contains `query_tester_trim_run_history`:
- Nightly janitor (cron `0 2 * * *`, disabled by default).
- Trims to 20 most recent runs per scheduled test (`MAX_RUN_HISTORY_PER_TEST` in `config.py`).
- Uses `| inputlookup` -> `streamstats` -> `where` -> `| outputlookup`.

### KVStore Admin Visibility

`transforms.conf` defines lookup definitions for `| inputlookup` inspection:
- `saved_tests_lookup` -- all fields except `definition` (large JSON).
- `scheduled_tests_lookup` -- all fields.
- `test_run_history_lookup` -- all fields except `splSnapshot`.
