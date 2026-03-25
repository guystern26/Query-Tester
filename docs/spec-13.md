# Spec 13 — Results Structure

## TestResponse

Top-level response from a test run:

```ts
interface TestResponse {
    passed: boolean;
    scenarioResults: ScenarioResult[];
    messages: ResponseMessage[];
    splAnalysis: SplAnalysis;
    timestamp: string;
}
```

---

## ScenarioResult

Per-scenario outcome:

```ts
interface ScenarioResult {
    scenarioId: string;
    scenarioName: string;
    passed: boolean;
    error?: string;
    warnings?: string[];
    resultCount: number;
    executionTimeMs: number;
    injectedSpl?: string;
    resultRows: Record<string, string>[];
    validations: ValidationDetail[];
}
```

- `resultRows`: flat key-value records from Splunk search results.
- `injectedSpl`: the rewritten SPL that was actually executed (with injected filters).
- `error`: set when the scenario failed due to an exception (not a validation failure).
- `warnings`: non-fatal issues encountered during execution.

---

## ValidationDetail

Per-condition validation outcome:

```ts
interface ValidationDetail {
    field: string;
    condition: string;
    expected: string;
    actual: string;
    passed: boolean;
    message: string;
    rowIndex?: number;
}
```

- `rowIndex`: which result row this validation applies to (for per-row conditions).
- `message`: human-readable description of the validation result.

---

## ResponseMessage

System-level messages (not per-scenario):

```ts
interface ResponseMessage {
    severity: 'info' | 'warning' | 'error' | 'fatal' | 'success';
    text: string;
    field?: string;
}
```

- `fatal`: stops the entire test run. Other severities are informational.
- `field`: optional reference to which field/section the message relates to.

---

## SplAnalysis

SPL analysis metadata returned with every response. Contains information about the parsed query (commands used, data sources referenced). Displayed in the results panel for debugging.

---

## Result Row Display

### Hidden Columns
Internal and injected fields are hidden from the results table:
- Fields starting with `_` (Splunk internal fields)
- Injected `run_id` fields (used for test isolation)
- Fields containing `{}` (nested JSON extraction artifacts)

### Non-Tabular Detection
If no visible structured fields remain after filtering, the UI shows a warning instead of an empty table. Handles cases where SPL produces only internal fields.

### Row Limits
`MAX_DISPLAY_ROWS` (from `core/constants/limits.ts`) caps rows rendered in the table. Total count shown separately (e.g., "Showing 50 of 1,234 rows").

---

## Display Helpers

### resultHelpers.ts
- Column visibility filtering (hide internal/injected fields)
- Non-tabular result detection
- Row count display logic

### formatters.ts (`utils/`)
- `formatMs(ms)`: converts milliseconds to human-readable duration (e.g., "1.2s", "45ms", "2m 30s").
- Used in ScenarioResultCard to display execution time.
