# Spec 12 — Component Architecture

## Component Tree

```
AppShell.tsx (hash-based router)
├── LibraryPage
│   ├── LibraryFilters (search, app, type, creator, status dropdowns)
│   ├── TestsTable
│   │   └── TestsTableRow[] (one per saved test)
│   └── ScheduleModal (gear icon per row)
│       ├── CronPicker (cron expression builder)
│       └── RecipientsList (email recipients)
│
├── StartPage (builder)
│   ├── SetupCard (initial) / SetupBar (compact after app selected)
│   ├── StepPipeline (progress indicator)
│   ├── QuerySection
│   │   ├── Ace editor (SPL with syntax highlighting)
│   │   ├── SplWarningOverlay (linter warnings via useAceMarkers)
│   │   ├── TimeRangePicker
│   │   └── Saved search selector dropdown
│   ├── ScenarioPanel[] (one per scenario, collapsible)
│   │   ├── ScenarioTabRow (scenario name, add/remove)
│   │   ├── InputCard[] (per input, with mode selector)
│   │   │   ├── FieldValueEditor (mode: fields)
│   │   │   ├── JsonInputView (mode: json)
│   │   │   ├── QueryDataView (mode: query_data)
│   │   │   ├── DataSourceSelector (mode picker)
│   │   │   └── EventGeneratorToggle -> GeneratorPanel
│   │   │       └── GeneratorRule -> type-specific Config component
│   │   └── ExtractFieldsButton (AI field extraction)
│   ├── ValidationSection
│   │   ├── ResultCountSection
│   │   ├── FieldConditionsGrid
│   │   │   └── FieldGroupCard[] -> ConditionRow[]
│   │   ├── FieldNameSelector (field dropdown)
│   │   ├── ValidationScope (per-scenario vs all)
│   │   ├── IjumpValidation / IjumpLockedCards / IjumpCustomConditions
│   │   └── SuggestFieldsButton (AI suggestion)
│   ├── ResultsBar (fixed bottom)
│   │   └── ResultsPanel (expandable)
│   │       └── ScenarioResultCard[]
│   │           ├── ValidationItem[] (pass/fail per condition)
│   │           └── ResultRowsTable (search result rows)
│   ├── TopBar
│   │   ├── TestNavigation (test controls)
│   │   ├── SaveTestModal
│   │   └── BugReportButton
│   └── TutorialOverlay
│       ├── TutorialSpotlight (highlight target element)
│       └── TutorialTooltip (step instructions)
│
├── SetupPage (admin-only)
│   ├── SplunkSection, HecSection, EmailSection (+ EmailAuthFields)
│   ├── WebUrlSection, LlmSection, LoggingSection, TempIndexSection
│   ├── CommandPolicySection -> PolicyRow[]
│   └── TestConnectionBar (HEC/SMTP connectivity test)
│
└── UnsavedChangesModal (navigating away with dirty state)
```

---

## Component Conventions

### Props
- Named interface declared above the component, never inline.
- Boolean props: `is`/`has`/`should` prefix (e.g., `isExpanded`, `hasError`).
- Handler props: `on` prefix (e.g., `onSave`, `onDelete`).
- Handler implementations: `handle` prefix (e.g., `handleSave`, `handleDelete`).

### State Access
- Components use `useTestStore()` with inline selectors.
- No prop drilling beyond one level. If a grandchild needs state, it calls `useTestStore()` directly.
- Example: `const isRunning = useTestStore((s) => s.isRunning);`

### Business Logic
- No business logic in components. All logic lives in store actions, utils, or hooks.
- No API calls in components. Always dispatch through store actions.
- Components are responsible for rendering and dispatching actions only.

### File Size
- Every component file under 200 lines.
- Single responsibility. If you need "and" to describe it, split it.

### UI Framework
- Use `@splunk/react-ui` components via `common/` wrappers.
- Never use MUI (`@mui/*`).
- IDs generated via `crypto.randomUUID()`.

### React 16 Constraints
- `ReactDOM.render()` only. No `createRoot`.
- No `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`.
- `useCallback`, `useMemo`, `useRef`, `useState`, `useEffect`, `useContext` are all fine.
- `React.memo` and `forwardRef` are fine.
