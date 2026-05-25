# Spec 01 -- Executive Summary

## Project

Splunk Query Tester -- a Splunk app for testing SPL queries with synthetic data injection. Build tests that inject controlled events into a temp index, run SPL queries against them, and validate results automatically.

## Monorepo Structure

Two packages under `packages/`:

| Package | Role |
|---------|------|
| `query-tester-app` | React frontend library (Zustand store, components, hooks, API layer) |
| `query-tester` | Splunk app wrapper (Webpack build) + Python REST backend (`stage/bin/`) |

## Core Data Hierarchy

```
TestDefinition
  -> Scenario[]
    -> TestInput[]
      -> InputEvent[]
        -> FieldValue[]
```

## Input Modes

| Mode | Behavior |
|------|----------|
| `fields` | Structured field-value pairs, multiple events per input |
| `json` | Raw JSON string, parsed as-is |
| `no_events` | No event injection, query runs against existing data |
| `query_data` | Sub-query fetches events instead of manual definition |

## Test & Validation Types

| Dimension | Options |
|-----------|---------|
| testType | `standard` (inject + query), `query_only` (query without injection) |
| validationType | `standard` (field conditions + result count), `ijump` (alert-based) |

## Pages (hash-based routing in AppShell.tsx)

| Hash | Page |
|------|------|
| `#library` | Test Library -- browse, load, create saved tests (default) |
| `#tester` | Builder -- design and run tests, `?test_id=xxx` loads a saved test |
| `#setup` | Admin Setup -- configure Splunk, HEC, email, LLM settings |

## Key Features

- **Save/Load tests** -- KVStore persistence with optimistic locking (version field)
- **Schedule tests** -- cron-based scheduling with backing Splunk saved searches
- **Run history** -- per-test execution records with status, duration, scenario results
- **SPL drift detection** -- compares saved search SPL against last passed run
- **Email alerts** -- SMTP notifications on scheduled test failures
- **Bug reports** -- generate formatted reports from test results
- **AI field extraction** -- LLM-powered input field and validation field suggestions
- **Interactive tutorial** -- guided walkthrough for new users
- **Admin setup page** -- auto-detection, connectivity testing, runtime config via KVStore

## Hard Constraints

| Constraint | Value |
|------------|-------|
| React | 16.13.1 -- no createRoot, useId, useTransition, etc. |
| Zustand | v4 -- `import create from 'zustand'` (default import) |
| Python | 3.7 -- no walrus, no `X \| None`, no match/case |
| Tailwind CSS | 3 -- not v4 |
| Node | 18.12 |
| External Python packages | None -- only stdlib + bundled splunklib |
| Line endings | LF only -- CRLF causes 500 on Linux Splunk |
| stdout | No `print()` -- corrupts REST responses |
