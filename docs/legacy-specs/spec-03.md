# Spec 03 -- Architectural Decisions

## Test Type: 2 Modes

```ts
type TestType = 'standard' | 'query_only';
```

- **standard** -- injects synthetic events into temp index, then runs the SPL query against them
- **query_only** -- runs the SPL query without injecting any events (tests against existing data)

## Validation Type: 2 Modes

```ts
type ValidationType = 'standard' | 'ijump';
```

- **standard** -- validates field conditions on query results + result count check
- **ijump** -- validates that an alert was triggered (alert-based validation)

iJump is a validation type, not a test type. The test structure (inputs + query) is identical to standard. Only validation differs.

## App Field

The `app` field on TestDefinition is required. It determines:
- Which Splunk app context to run queries in
- Which saved searches are available in the picker
- Stored on save so the backend knows the execution context

## combinationMode: Removed

Each scenario has independent inputs. No cartesian product, no combination logic. All scenarios in a test execute as part of a single API call, but each scenario's inputs are indexed and queried separately.

## InputMode: Per-Input, Not Per-Scenario

```ts
type InputMode = 'fields' | 'json' | 'no_events' | 'query_data';
```

Each `TestInput` has its own mode. Different inputs within the same scenario can use different modes.

- **fields** -- structured field-value pairs with multiple events
- **json** -- raw JSON string, parsed as-is
- **no_events** -- empty events, scenario runs query without injection for this input
- **query_data** -- sub-query fetches events at runtime instead of manual definition

## Single Store Architecture

One Zustand v4 store with Immer middleware replaces the old multi-hook architecture. Store is composed from 8 slices in `core/store/slices/`. No prop drilling -- components use `useTestStore()` with selectors.

## AppShell Hash Router

Hash-based routing in `AppShell.tsx`:

| Route | Page |
|-------|------|
| `#library` | Test Library (default) |
| `#tester` | Builder/tester |
| `#tester?test_id=xxx` | Builder with a specific saved test loaded |
| `#setup` | Admin Setup page |

Hash takes priority over URL query params. Email notification links use `?test_id=xxx` (no hash) which routes to tester on initial load.

## Unsaved Changes Guard

The builder tracks `hasUnsavedChanges` (auto-detected via store subscription comparing `tests` reference). User is prompted before navigating away with dirty state.

## Optimistic Locking

Both `saved_tests` and `scheduled_tests` KVStore collections use a `version` integer field:
- Born at `1` on POST
- PUT compares payload version against stored version
- Mismatch returns `409 Conflict`
- On match, version increments: `stored + 1`
- Legacy records (version=0 or missing) skip the check but get version set to `1`

## Ownership Enforcement

- `createdBy` is always set from the session token, never from the request body
- PUT/DELETE check that `session.user == record.createdBy`
- Admin users (roles in `ADMIN_ROLES`) bypass ownership checks
- Records with empty `createdBy` (legacy) allow anyone to modify

## Saved Search Flow

No manual/saved_search mode toggle. The SPL editor is always visible. `SavedSearchPicker` is a helper dropdown:
1. Fetches saved searches scoped to the selected app
2. When picked, loads SPL into the editor
3. Stores `savedSearchOrigin` for reference and drift detection
4. The actual SPL text is always what gets sent to the backend

## Validation Scoping

`validationScope: 'per_scenario' | 'aggregate'` determines whether validation runs per-scenario or on combined results. Individual field conditions can also have `scenarioScope` limiting them to specific scenarios.
