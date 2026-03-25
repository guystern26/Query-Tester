# Spec 07 — UX Design & Pages

## Hash-Based Routing (AppShell.tsx)

Three pages routed via `location.hash`:

| Hash | Page | Default? |
|------|------|----------|
| `#library` | Library | Yes |
| `#tester` / `#tester?test_id=xxx` | Builder | No |
| `#setup` | Setup (admin-only) | No |

Hash takes priority over URL query params. Email notification links use `?test_id=xxx` (no hash) which routes to the builder on initial load.

---

## Library Page (`#library`)

Browse all saved tests in a filterable table.

**Filters** (AND logic, all client-side via `useLibraryFilters`):
- **Search** — free-text on test name (case-insensitive)
- **App** — exact match, options derived from saved tests
- **Type** — matches `validationType` (Standard, iJump), NOT `testType`
- **Creator** — exact match on `createdBy`
- **Status** — Passed / Failed / Error / Not run yet (from linked ScheduledTest)

**Actions per row:** Load into builder, schedule/manage (gear icon opens ScheduleModal with CronPicker + RecipientsList).

---

## Builder Page (`#tester`)

Progressive horizontal flow: Setup > Query > Inputs/Scenarios > Validation > Run.

### Setup Phase
- **Initial mode:** SetupCard with test name input, app selector, test type selector.
- **Compact mode:** After app is selected, collapses to a single SetupBar.

### Query Section
- Ace editor with SPL syntax highlighting.
- SPL linting: `splLinter.ts` detects dangerous commands (delete, outputlookup). Warnings shown as inline Ace markers + gutter annotations via `useAceMarkers`.
- Linting triggers on blur, on external SPL change (when editor not focused). Cleared on focus.
- Saved search selector dropdown to populate SPL from existing alerts/reports.
- TimeRangePicker for search time range.

### Scenarios
- Collapsible ScenarioPanel per scenario with tab-based navigation.
- Each scenario contains InputCard components with mode selector:
  - `fields` — structured field-value editor
  - `json` — raw JSON editor
  - `no_events` — no input data
  - `query_data` — populate from a Splunk sub-query
- EventGeneratorToggle per input for auto-generating test events.
- ExtractFieldsButton (AI-powered field extraction).

### Validation
- **Standard:** FieldConditionsGrid (field groups with condition rows) + ResultCountSection + ValidationScope.
- **iJump:** Alert-based validation with IjumpValidation, IjumpLockedCards, IjumpCustomConditions.
- SuggestFieldsButton (AI-powered field suggestion).

### Results Bar
Fixed bottom bar with:
- Run button with progress indicator.
- ScenarioResultCard per scenario showing pass/fail, duration, validation details.
- Expandable ResultsPanel with ResultRowsTable for detailed result inspection.

---

## Setup Page (`#setup`)

Admin-only configuration page. Sections:
- **Splunk Connection** — host, port, scheme, credentials (display/URL only)
- **HEC** — host, port, token, SSL verify, timeout
- **Email/SMTP** — server, port, from, auth method, credentials, TLS (auto-inferred)
- **Web URL** — Splunk Web base URL for email links
- **LLM** — endpoint, API key, model, max tokens
- **Logging** — log level (applied dynamically)
- **Temp Index** — read-only display of temp index name
- **Command Policy** — dangerous command allow/deny list

TestConnectionBar for HEC and SMTP connectivity testing. Auto-detection pre-fills on first load.

---

## Modal Behaviors

**UnsavedChangesModal:** Prompts when navigating away from builder with dirty state. Options: Discard / Save / Stay.

**SaveTestModal:** Save to library with name, triggered from TopBar.

---

## SPL Drift Warning

Amber banner in QuerySection when a saved search's SPL has changed since the test was last saved. Actions: "Reload SPL" (fetches current) or dismiss (X button). Fires async on `loadTestIntoBuilder()`.

---

## Visual Design

- **Dark mode only** — no light mode toggle.
- Backgrounds: navy-950 (`#0a1628`), navy-900 (`#162033`), navy-800 (`#202b43`), navy-700 (`#2a3a5c`).
- Text: slate-200 (primary), slate-400 (secondary).
- Accent: steel-400 (`#9BB1BB`) for subtle text.
- Buttons: blue-400 (`#60A5FA`) primary with white text. Hover: `#93C5FD`. Active: `#3B82F6`.
- Borders: slate-700.
- **Banned accent colors:** No cyan, sky, or indigo anywhere.
- Wrapped in SplunkThemeProvider: `family=enterprise`, `colorScheme=dark`, `density=comfortable`.
