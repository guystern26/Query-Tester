### 14. Errors & Warnings System

Errors and warnings use the same interface (ResponseMessage). They live in separate arrays on the response. The frontend renders whatever is present. If both arrays are empty, nothing shows.

**17.1 The Unified ResponseMessage**
```
interface ResponseMessage {
code: string;          // machine-readable: 'UNKNOWN_COMMAND', 'LOOKUP_NOT_FOUND', etc.
message: string;       // human-readable description
severity: 'fatal' | 'error' | 'warning' | 'caution' | 'info';
source?: string;       // which SPL command or stage caused it
line?: number;         // line number in SPL if applicable
tip?: string;          // actionable suggestion for the user
}
```

**17.2 Severity Levels & Colors**

| Severity | Color | When | Test Results? |
| --- | --- | --- | --- |
| fatal | Red (--danger) | 500, crash, query completely failed | No. Test never ran. scenarioResults is empty. |
| error | Red (--danger) | Splunk error: bad command, no such field | Possibly partial. Some scenarios may have run. |
| warning | Orange (--warning) | Join limits, subsearch limits, resource issues | Yes. Query ran but with caveats. |
| caution | Yellow (--warning dimmed) | Performance hints, deprecated commands | Yes. Everything ran fine. |
| info | Blue (--accent) | Informational notes, metadata | Yes. Just FYI. |

**17.3 Three Rendering Scenarios**

**Scenario A: Fatal Error (no results)**
Backend returns status: 'error', errors: [{severity: 'fatal', ...}], scenarioResults: []. The ResultsPanel shows only the error card with red theme. No scenario results, no summary stats. The Run button resets to 'Rerun'.

**Scenario B: Errors + Partial Results**
Backend returns status: 'partial', errors: [{severity: 'error', ...}], scenarioResults: [some results]. The ResultsPanel shows the error card at top, then scenario result cards below. User can see which scenarios ran and which failed due to the error.

**Scenario C: Warnings + Full Results**
Backend returns status: 'success' or 'partial', errors: [], warnings: [{severity: 'warning', ...}]. The ResultsPanel shows a compact warning banner (collapsible) above the scenario results. Warnings don't block anything — they're informational.

**17.4 Frontend Components**

**QueryErrorsCard**
Renders errors[] array. Each error shows: severity icon + color, message, source command (if present), line number (if present), tip (if present in a lighter box below the error). Has a 'Copy All' button. Only renders when errors.length > 0.

**QueryWarningsCard**
Renders warnings[] array. Same layout as errors but with orange/yellow theme. Collapsible by default when results are also present (user clicked 'Run' and got results + warnings). Expanded by default when no results (warning-only scenario). Only renders when warnings.length > 0.

**QueryTipsCard (removed)**
The old QueryTipsCard with frontend regex pattern matching is removed. Tips now come from the backend inside the ResponseMessage.tip field, rendered inline with each error/warning. The backend knows exactly what went wrong and provides the right tip. No more frontend guessing.

**17.5 Backend Responsibility**
The backend is responsible for:
**Classifying severity: **The Python validator and query executor tag each issue with the correct severity level.
**Providing codes: **Machine-readable codes (UNKNOWN_COMMAND, LOOKUP_NOT_FOUND, TIMEOUT, PERMISSION_DENIED, JOIN_LIMIT, SUBSEARCH_LIMIT, SYNTAX_ERROR, NO_RESULTS, FIELD_NOT_FOUND) for programmatic handling.
**Including tips: **Actionable suggestions directly on the message. 'LOOKUP_NOT_FOUND' → tip: 'Check that the lookup file exists and the name is spelled correctly.'
**Populating source + line: **When the issue relates to a specific SPL command, include which command and which line.
**Always returning both arrays: **Even when empty. errors: [] and warnings: [] are always present on every response. The frontend never has to check for undefined.

**17.6 Store Integration**
```
// In testStore.ts, results state:
interface TestStoreState {
// ...existing state...
testResponse: TestResponse | null;
isRunning: boolean;
}
```

```
// Actions:
setTestResponse: (response: TestResponse) => set(draft => {
draft.testResponse = response;
draft.isRunning = false;
}),
```

```
clearResults: () => set(draft => {
draft.testResponse = null;
}),
```

```
// Selectors for components:
export const selectErrors = (s: TestStoreState) =>
s.testResponse?.errors ?? [];
export const selectWarnings = (s: TestStoreState) =>
s.testResponse?.warnings ?? [];
export const selectHasResults = (s: TestStoreState) =>
(s.testResponse?.scenarioResults?.length ?? 0) > 0;
```