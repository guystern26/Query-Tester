### 13. Results Structure

The backend returns a hierarchical results structure that mirrors the test hierarchy: Test → Scenario → Input → Event → Field. This is the complete response the frontend receives after running a test.

**17.1 Response Envelope**
```
interface TestResponse {
status: 'success' | 'error' | 'partial';
message: string;                     // human-readable summary
testName: string;
testType: TestType;
timestamp: string;                   // ISO datetime
executionTimeMs: number;
```

```
// Errors and warnings (same shape, separate arrays)
errors: ResponseMessage[];
warnings: ResponseMessage[];
```

```
// Query execution metadata
queryInfo: QueryInfo;
```

```
// Per-scenario validation results (empty if errors prevented execution)
summary: TestResultSummary;
scenarioResults: ScenarioResult[];
}
```

**17.2 QueryInfo**
```
interface QueryInfo {
executedQuery: string;               // the actual SPL that ran
executionTimeMs: number;
resultCount: number;
scanCount: number;
earliestTime?: string;
latestTime?: string;
}
```

**17.3 Summary**
```
interface TestResultSummary {
totalScenarios: number;
passedScenarios: number;
failedScenarios: number;
totalInputs: number;
totalEvents: number;
validationType: ValidationType;
}
```

**17.4 Hierarchical Results**
```
interface ScenarioResult {
scenarioId: EntityId;
scenarioName: string;
passed: boolean;
inputsProcessed: number;
inputsPassed: number;
inputResults: InputResult[];
}
```

```
interface InputResult {
inputId: EntityId;
passed: boolean;
eventsValidated: number;
eventsPassed: number;
eventResults: EventValidationResult[];
executionTimeMs?: number;
error?: string;
}
```

```
interface EventValidationResult {
eventIndex: number;
passed: boolean;
fieldValidations: FieldValidationResult[];
error?: string;
}
```

```
interface FieldValidationResult {
field: string;
passed: boolean;
expected?: string;
actual?: string;
message?: string;
}
```

**17.5 Example Response**
```
{
"status": "partial",
"message": "1 of 2 scenarios passed",
"errors": [],
"warnings": [
{ "code": "JOIN_LIMIT", "message": "join limited to 50,000 results",
"severity": "warning", "source": "join", "line": 3,
"tip": "Consider using append with stats instead of join." }
],
"summary": { "totalScenarios": 2, "passedScenarios": 1, "failedScenarios": 1,
"totalInputs": 3, "totalEvents": 5, "validationType": "standard" },
"scenarioResults": [
{ "scenarioName": "Normal User", "passed": true, "inputResults": [ ... ] },
{ "scenarioName": "Attacker", "passed": false, "inputResults": [
{ "passed": false, "eventResults": [
{ "eventIndex": 0, "passed": false, "fieldValidations": [
{ "field": "count", "passed": false, "expected": "5", "actual": "12",
"message": "Expected 5 but got 12" }
] }
] }
] }
]
}
```