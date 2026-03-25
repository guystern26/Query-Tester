# spec-19 — UX Polish & Edge Cases

## Event Field Inheritance

The first event in a scenario defines template fields. Subsequent events inherit
those field names — the UI pre-populates field inputs so users only need to change
values, not re-add every field.

## Multivalue Display

Newline-separated values in field inputs are displayed as pills/tags in the events
table. Internally stored as a single string with `\n` delimiters.

## Input Limits

`MAX_QUERY_DATA_EVENTS` (10,000, from `config.py`) — caps the number of events
that can be pulled via `query_data` input mode. Enforced backend-side.

## Run Button States

| State | Appearance | Action |
|-------|------------|--------|
| Incomplete (missing SPL/app) | Disabled/gray | None |
| Ready | Blue (`#60A5FA`) | Start run |
| Running | Shows cancel option | Abort run |
| Complete | Rerun styling | Start new run |

## Results Bar

Fixed bottom bar, collapsible. Shows aggregate pass/fail count across all scenarios.
Clicking expands the full results panel.

## Scenario Result Cards

- **Failed scenarios:** auto-expanded to show details immediately
- **Passed scenarios:** collapsed by default to reduce noise
- Each card shows: scenario name, pass/fail status, validation results, warnings

## Hidden Splunk Fields

Results table auto-hides internal Splunk fields:
`_time`, `_raw`, `_serial`, `_si`, `_indextime`, `_cd`, `_bkt`, `_sourcetype`,
`_subsecond`, `splunk_server`, `splunk_server_group`, and similar.

## Injected Run ID Columns

The `run_id` and related injection columns are hidden by default in results display
but can be toggled visible for debugging.

## Non-Tabular Results

When the query returns raw events without structured fields, a warning is displayed
explaining that validation requires tabular (stats/table) output.

## SPL Drift Warning

Amber banner in the query section when a saved test's SPL differs from the current
saved search SPL. Two actions:
- **Reload SPL** — fetches current SPL from the saved search and updates the test
- **Dismiss (X)** — hides the warning without changing anything

Triggers on `loadTestIntoBuilder()` when `savedSearchOrigin` is set.

## Toast / Error Display

- `configError` in store — shown on the Setup page as an error banner
- API errors surface as toast notifications or inline error messages
- Run errors shown in the results panel per-scenario

## Loading States

- Skeleton loaders for library page test cards
- Spinner for async operations (save, run, fetch)
- Disabled buttons during pending operations to prevent double-submission

## Library Filters

Client-side filtering via `useLibraryFilters` hook:
- **Search** — case-insensitive match on test name
- **App** — exact match on `app` field
- **Type** — matches `validationType` (Standard vs iJump)
- **Creator** — exact match on `createdBy`
- **Status** — matches `lastRunStatus` from linked schedule (Passed/Failed/Error/Not run yet)

All filters combine with AND logic. Filter options derived dynamically from the
saved tests list.
