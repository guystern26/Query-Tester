# spec-15 — Navigation, Save & Bug Report

## TopBar

Fixed top bar displays:
- Test name (read-only display)
- Save button (triggers save flow)
- Bug report button (opens BugReportModal)
- Navigation link back to library (`#library`)

## SaveTestModal

Opened from the TopBar save button. Two modes:

### Save New
- Inputs: name (required), description (optional)
- `POST /data/saved_tests` with full test definition
- On success: sets `savedTestId` and `savedTestVersion` in store

### Update Existing
- Sends `PUT /data/saved_tests/{id}` with `version` for optimistic locking
- On success: increments local `savedTestVersion`
- On `409 Conflict`: displays "This test was modified by someone else — please reload
  before saving."

## BugReportButton

Opens `BugReportModal` for sending bug reports or feature requests via email.

- **Types:** `bug` or `feature_request`
- **Attachment:** version 2 import format JSON (same format as save file export)
- **Recipient:** `DEFAULT_ALERT_EMAIL` from `config.py`
- **Backend:** `bug_report_handler.py` — builds and sends email via SMTP
- **Delivery:** fire-and-forget, error shown as toast on failure

## AppShell Routing

Hash-based routing inside the `QueryTesterApp` Splunk page (`AppShell.tsx`):

| Hash | Page |
|------|------|
| `#library` | Library page (default) |
| `#tester` | Builder/tester page |
| `#tester?test_id=xxx` | Builder with auto-load |
| `#setup` | Admin Setup page |

### URL Behavior

- `setHash()` helper strips stale `?test_id=` from the URL when navigating
- Email notification links use `?test_id=xxx` (no hash) for initial load
- **Hash takes priority** over URL query params once set — prevents getting stuck
  on the tester page when `#library` is active but `?test_id=` lingers

## Unsaved Changes Guard

Protects against accidental data loss when navigating away with unsaved changes.

### Detection

`hasUnsavedChanges` in store — set via store subscription that compares the `tests`
object reference against the last saved snapshot.

### Triggers

| Trigger | Mechanism |
|---------|-----------|
| Browser close/refresh | `beforeunload` event |
| Hash change (navigation) | Hash change interception |

### UnsavedChangesModal

Three options:
- **Discard** — navigate away, lose changes
- **Save** — for existing tests: inline PUT (no modal). For new tests: opens
  SaveTestModal first
- **Stay** — cancel navigation, remain on current page
