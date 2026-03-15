# Save & Schedule Flow — End-to-End Documentation

This document describes exactly what happens when a user saves a test and schedules it for recurring execution, covering every layer from the UI click to the Splunk saved search that runs it on a cron.

---

## 1. Saving a Test

### 1.1 What the user sees

In the Builder (StartPage), clicking the **Save** button in the TopBar opens `SaveTestModal`. Two modes:

| Scenario | Modal behavior |
|---|---|
| **New test** (never saved) | Shows name + description fields. Calls `onSaveNew(name, desc)`. |
| **Existing test** (previously saved) | Default: "Update existing" — shows confirmation text, no name editing. Toggle to "Save as new copy" to enter a new name. |

### 1.2 Frontend flow

```
User clicks Save
    └─> SaveTestModal opens
        └─> onSaveNew(name, desc) or onUpdate(id, name, desc)
            └─> Zustand store action (testLibrarySlice)
                └─> savedTestsApi.saveTest() or .updateTest()
                    └─> HTTP POST/PUT to Splunk REST endpoint
```

**Store actions** (`testLibrarySlice.ts`):

- **`saveCurrentTest(name, description)`** — Takes the active `TestDefinition` from the store, sends it as a new record.
- **`updateSavedTest(id, name, description)`** — Updates an existing record with the current `TestDefinition`.

Both actions:
1. Set `isSaving = true`
2. Read the active test from `state.tests` using `state.activeTestId`
3. Call the API
4. On success: update `savedTests[]` in the store, set `savedTestId`, clear `hasUnsavedChanges`

### 1.3 API layer (`savedTestsApi.ts`)

| Method | HTTP | URL |
|---|---|---|
| `saveTest(payload)` | `POST` | `/splunkd/__raw/services/splunk_query_tester/data/saved_tests` |
| `updateTest(id, payload)` | `PUT` | `/splunkd/__raw/services/splunk_query_tester/data/saved_tests?id=<id>` |
| `deleteTest(id)` | `DELETE` | Same URL pattern with `?id=<id>` |
| `listTests()` | `GET` | Same base URL (returns all tests with full definitions) |

**Payload shape** (POST/PUT body):
```json
{
  "name": "My Test",
  "description": "Checks failed logins",
  "definition": { /* full TestDefinition object */ }
}
```

The `definition` field is the entire test state: app, testType, query (SPL + timeRange), scenarios (with inputs, events, field values), and validation config.

### 1.4 Backend handler (`saved_tests_handler.py`)

The handler is a Splunk `PersistentServerConnectionApplication` registered at `/data/saved_tests` in `restmap.conf`.

**POST (create):**
1. Extracts session key from `request.session.authtoken` or `request.system_authtoken`
2. Parses JSON payload from request body
3. Builds a record with:
   - `id`: new UUID
   - `name`, `description`: from payload
   - `definition`: JSON-stringified TestDefinition
   - `app`, `testType`, `validationType`: extracted from definition for filtering
   - `scenarioCount`: counted from definition
   - `createdAt`, `updatedAt`: current UTC timestamp
   - `createdBy`: `"admin"` (hardcoded)
4. Writes to KVStore collection `saved_tests` via `KVStoreClient.upsert()`
5. Returns the created record as JSON

**PUT (update):**
1. Extracts record ID from query params (`?id=xxx`)
2. Reads existing record from KVStore
3. Merges payload fields into existing record
4. Writes back to KVStore
5. Returns updated record

### 1.5 Storage: KVStore collection `saved_tests`

Defined in `collections.conf`:
```ini
[saved_tests]
field.id = string
field.name = string
field.app = string
field.testType = string
field.validationType = string
field.createdAt = string
field.updatedAt = string
field.createdBy = string
field.scenarioCount = string
field.description = string
field.definition = string    # JSON-stringified TestDefinition
```

The `definition` field stores the entire test configuration as a JSON string. When reading, the handler parses it back: `r["definition"] = json.loads(r["definition"])`.

---

## 2. Scheduling a Test

### 2.1 What the user sees

From the Library page, clicking the **clock icon** on a test row opens the `ScheduleModal`. The modal contains:

- **Test selector** (dropdown, disabled when editing existing schedule)
- **Cron picker** (preset options + custom cron expression)
- **Enabled toggle** (on/off — controls whether the cron job is active)
- **Alert on failure toggle** (on/off)
- **Email recipients** (list of emails, shown only when alert is on)

### 2.2 Frontend flow

```
User clicks clock icon on a test row
    └─> ScheduleModal opens
        └─> handleSave()
            └─> createScheduledTest() or updateScheduledTest()
                └─> scheduledTestsApi.createScheduledTest() or .updateScheduledTest()
                    └─> HTTP POST/PUT to Splunk REST endpoint
                        └─> Backend creates KVStore record + Splunk saved search
```

**Store actions** (`scheduledTestsSlice.ts`):

- **`createScheduledTest(payload)`** — Creates a new scheduled test record.
- **`updateScheduledTest(id, patch)`** — Uses **optimistic update**: immediately applies the patch to the store (so toggle feels instant), then syncs with the backend. Reverts on failure.

### 2.3 API layer (`scheduledTestsApi.ts`)

| Method | HTTP | URL |
|---|---|---|
| `createScheduledTest(payload)` | `POST` | `/splunkd/__raw/services/splunk_query_tester/data/scheduled_tests` |
| `updateScheduledTest(id, patch)` | `PUT` | Same URL with `?id=<id>` |
| `deleteScheduledTest(id)` | `DELETE` | Same URL with `?id=<id>` |
| `getScheduledTests()` | `GET` | Same base URL |

**Create payload:**
```json
{
  "testId": "uuid-of-saved-test",
  "testName": "My Test",
  "app": "search",
  "savedSearchOrigin": null,
  "cronSchedule": "0 6 * * *",
  "enabled": true,
  "alertOnFailure": false,
  "emailRecipients": ["admin@example.com"]
}
```

**Update (toggle) payload** (partial):
```json
{
  "enabled": false
}
```

### 2.4 Backend handler (`scheduled_tests_handler.py`)

Registered at `/data/scheduled_tests` in `restmap.conf`.

**POST (create):**
1. Parses payload, builds record with UUID, timestamps, etc.
2. Writes record to KVStore collection `scheduled_tests`
3. **Creates a Splunk saved search** via `scheduled_search_manager.create_saved_search()`
4. Returns the created record

**PUT (update):**
1. Reads existing record from KVStore
2. Merges patch fields into existing record
3. Writes back to KVStore
4. **Updates the Splunk saved search** via `scheduled_search_manager.update_saved_search()`
5. Returns updated record

**DELETE:**
1. Deletes record from KVStore
2. **Deletes the Splunk saved search** via `scheduled_search_manager.delete_saved_search()`

### 2.5 Storage: KVStore collection `scheduled_tests`

```ini
[scheduled_tests]
field.id = string
field.testId = string           # FK to saved_tests.id
field.testName = string
field.app = string
field.savedSearchOrigin = string
field.cronSchedule = string     # e.g. "0 6 * * *"
field.enabled = string          # "1"/"0" or "true"/"false" (KVStore stores as string)
field.createdAt = string
field.lastRunAt = string
field.lastRunStatus = string
field.alertOnFailure = string   # "true"/"false"
field.emailRecipients = string  # JSON array as string
```

**Important:** KVStore stores all values as strings. The `enabled` field may be `"1"`, `"0"`, `"true"`, `"false"`, or an actual boolean (depending on how it was written). Both the frontend (`TestsTableRow.tsx`) and backend (`scheduled_search_manager.py`) normalize this with an `_is_enabled()` helper.

---

## 3. How Splunk Runs Tests on a Cron Schedule

### 3.1 The saved search (`scheduled_search_manager.py`)

When a schedule is created, `create_saved_search()` creates a **Splunk saved search** (the same mechanism Splunk uses for alerts and reports):

```python
service.saved_searches.create(
    name,          # "QueryTester_Scheduled_<record_id>"
    search=spl,    # '| makeresults | eval test_id="<test_id>"'
    **{
        "cron_schedule": record.get("cronSchedule", "0 6 * * *"),
        "is_scheduled": "1",
        "disabled": "0" if _is_enabled(record) else "1",
    }
)
```

| Parameter | Value | Purpose |
|---|---|---|
| `name` | `QueryTester_Scheduled_<uuid>` | Unique name prefixed for easy identification |
| `search` | `\| makeresults \| eval test_id="<id>"` | Placeholder SPL (the actual test execution is triggered by the alert action, not the search itself) |
| `cron_schedule` | From the schedule record | When Splunk should fire the search |
| `is_scheduled` | `"1"` | Tells Splunk to run it on the cron |
| `disabled` | `"0"` or `"1"` | Controls whether the cron job is active |

### 3.2 Enable/disable toggle

When the user toggles enabled/disabled in the Library:

```
UI toggle click
    └─> optimistic store update (instant visual feedback)
    └─> PUT /data/scheduled_tests?id=xxx  { "enabled": true/false }
        └─> Backend: KVStore record updated
        └─> Backend: update_saved_search() called
            └─> Splunk saved search disabled="0" or disabled="1"
```

`update_saved_search()` in `scheduled_search_manager.py`:
```python
ss = service.saved_searches[name]
ss.update(
    cron_schedule=record.get("cronSchedule", "0 6 * * *"),
    disabled="0" if _is_enabled(record) else "1",
)
```

The `_is_enabled()` helper normalizes the various string/bool representations:
```python
def _is_enabled(record):
    val = record.get("enabled", True)
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("1", "true", "yes")
    return bool(val)
```

### 3.3 What happens when the cron fires

Currently, the saved search runs the placeholder SPL (`| makeresults | eval test_id="..."`). The actual test execution mechanism (alert action that calls the test runner) is **not yet wired up** — the saved search fires but doesn't trigger the full test pipeline.

When fully implemented, the flow would be:
1. Splunk scheduler fires the saved search at the cron time
2. An alert action triggers with the `test_id`
3. The alert action calls the test runner (`core/test_runner.py`) with the saved test's definition
4. Results are written to the `test_run_history` KVStore collection

---

## 4. Where Configurations Are Stored and Sent

### 4.1 Summary table

| Data | Where stored | How accessed |
|---|---|---|
| Test definition (SPL, scenarios, validation) | KVStore `saved_tests.definition` (JSON string) | REST `/data/saved_tests` |
| Schedule config (cron, enabled, alert settings) | KVStore `scheduled_tests` | REST `/data/scheduled_tests` |
| Cron job active/inactive | Splunk saved search `disabled` field | `splunklib.client` via `scheduled_search_manager.py` |
| Alert on failure flag | KVStore `scheduled_tests.alertOnFailure` | REST `/data/scheduled_tests` |
| Email recipients | KVStore `scheduled_tests.emailRecipients` (JSON array as string) | REST `/data/scheduled_tests` |
| Run history | KVStore `test_run_history` | REST `/data/test_run_history` |

### 4.2 Splunk config files involved

| File | Purpose |
|---|---|
| `restmap.conf` | Maps REST URLs to Python handlers. All handlers use `passSystemAuth = true` to get session tokens. |
| `web.conf` | Exposes REST endpoints through Splunk Web proxy (port 8000). Pattern: `splunk_query_tester/data/*` |
| `collections.conf` | Defines KVStore collections: `saved_tests`, `scheduled_tests`, `test_run_history` |
| `app.conf` | App metadata and version |

### 4.3 REST endpoint map

All endpoints are under the Splunk Web proxy at:
`http://localhost:8000/en-US/splunkd/__raw/services/splunk_query_tester/data/`

| Endpoint | Handler | KVStore Collection |
|---|---|---|
| `/data/saved_tests` | `saved_tests_handler.py` | `saved_tests` |
| `/data/scheduled_tests` | `scheduled_tests_handler.py` | `scheduled_tests` |
| `/data/test_run_history` | `run_history_handler.py` | `test_run_history` |
| `/data/tester` | `query_tester.py` | (none — runs tests in real-time) |

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  SaveTestModal ──> testLibrarySlice ──> savedTestsApi ─────────┤──> POST/PUT /data/saved_tests
│                                                                 │
│  ScheduleModal ──> scheduledTestsSlice ──> scheduledTestsApi ──┤──> POST/PUT /data/scheduled_tests
│                                                                 │
│  Toggle switch ──> updateScheduledTest() (optimistic) ─────────┤──> PUT /data/scheduled_tests
│                    (instant UI, async backend)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SPLUNK REST HANDLERS (Python)                 │
│                                                                 │
│  saved_tests_handler.py                                         │
│    └─> KVStoreClient.upsert("saved_tests", ...)                │
│                                                                 │
│  scheduled_tests_handler.py                                     │
│    ├─> KVStoreClient.upsert("scheduled_tests", ...)            │
│    └─> scheduled_search_manager.py                              │
│         ├─> create_saved_search()  → splunklib saved_searches   │
│         ├─> update_saved_search()  → ss.update(disabled=...)    │
│         └─> delete_saved_search()  → saved_searches.delete()    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SPLUNK PLATFORM                            │
│                                                                 │
│  KVStore Collections:                                           │
│    saved_tests        → test definitions (JSON)                 │
│    scheduled_tests    → schedule config (cron, enabled, alert)  │
│    test_run_history   → execution results                       │
│                                                                 │
│  Saved Searches:                                                │
│    QueryTester_Scheduled_<id>                                   │
│      cron_schedule = "0 6 * * *"                                │
│      disabled = "0" (enabled) or "1" (disabled)                 │
│      is_scheduled = "1"                                         │
│      search = '| makeresults | eval test_id="<id>"'             │
│                                                                 │
│  Splunk Scheduler fires saved search on cron ──> (alert action  │
│  to run test — not yet wired)                                   │
└─────────────────────────────────────────────────────────────────┘
```
