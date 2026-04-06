# spec-17 — Debounce & Hooks

## useSavedSearches

`hooks/useSavedSearches.ts`

Fetches Splunk saved searches for the selected app. Provides a debounced search
input so users can filter by name without hammering the API.

- Fetches on app change
- Search input debounced (typing delay before API call)
- Returns `{ searches, isLoading, searchTerm, setSearchTerm }`

## useLoadTest

`hooks/useLoadTest.ts`

Extracted from `StartPage.tsx`. Handles loading a saved test by ID on initial mount
or when `test_id` changes.

Flow:
1. If saved tests not yet fetched, fetches them first
2. Finds test by ID in the saved tests list
3. Calls `loadTestIntoBuilder()` to populate the store
4. Calls `loadLastRun()` to fetch the most recent run result

## useLoadLastRun

`hooks/useLoadLastRun.ts`

Fetches the last run result for a loaded test. Called after `loadTestIntoBuilder()`
completes. Populates the run result state so the user sees previous results
immediately.

## Debounce Patterns

### Test Name (300ms)

`StartPage.tsx` maintains `localName` state that updates immediately on keystroke.
A 300ms debounced callback calls `updateTestName()` on the store. This prevents
store thrash during fast typing while keeping the input responsive.

### JSON Editor

JSON input editors use debounced parsing to avoid showing parse errors while the
user is mid-edit. The raw text updates immediately; JSON.parse runs after typing
stops.

### SPL Editor

- `onChange` fires immediately — SPL is written to the store on every keystroke
- Linting does NOT run on change — only triggers on blur
- This separation keeps the editor responsive while deferring expensive analysis

## hasUnsavedChanges Detection

Store subscription pattern:

1. On save or load, a snapshot of the `tests` array reference is stored
2. A Zustand `subscribe()` callback watches the `tests` reference
3. If the reference changes (Immer produces a new object on any mutation),
   `hasUnsavedChanges` flips to `true`
4. Resets to `false` on successful save or fresh load
