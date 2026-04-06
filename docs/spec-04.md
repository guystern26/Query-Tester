# Spec 04 -- Unified Data Model

## Enums & IDs

```ts
type EntityId = string;                    // crypto.randomUUID()
type TestType = 'standard' | 'query_only';
type ValidationType = 'standard' | 'ijump';
type InputMode = 'fields' | 'json' | 'no_events' | 'query_data';
type ConditionOperator = 'equals' | 'contains' | 'regex' | 'not_empty';
type ResultCountOperator = 'equals' | 'greater_than' | 'less_than';
```

## Core Type Hierarchy

```ts
interface FieldValue {
    id: EntityId;
    field: string;
    value: string;
}

interface InputEvent {
    id: EntityId;
    fieldValues: FieldValue[];
}

interface QueryDataConfig {
    spl: string;
    earliest: string;
    latest: string;
    maxEvents: number;
}

interface TestInput {
    id: EntityId;
    rowIdentifier: string;
    mode: InputMode;
    events: InputEvent[];
    generatorConfig: GeneratorConfig;
    queryDataConfig?: QueryDataConfig;
}

interface Scenario {
    id: EntityId;
    name: string;
    inputs: TestInput[];
}

interface QueryConfig {
    spl: string;
    timeRange: { earliest: string; latest: string };
}

interface Condition {
    id: EntityId;
    operator: ConditionOperator;
    value: string;
}

interface FieldGroup {
    id: EntityId;
    field: string;
    conditions: Condition[];
}

interface ValidationConfig {
    validationType: ValidationType;
    resultCount: { operator: ResultCountOperator; value: number };
    fieldGroups: FieldGroup[];
    validationScope: 'per_scenario' | 'aggregate';
    ijumpConfig?: { alertName: string; triggerCondition: string };
}

interface TestDefinition {
    id: EntityId;
    name: string;
    app: string;
    testType: TestType;
    query: QueryConfig;
    scenarios: Scenario[];
    validation: ValidationConfig;
}
```

## Saved Test Types

```ts
interface SavedTestMeta {
    id: string;
    name: string;
    app: string;
    testType: TestType;
    validationType: ValidationType;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    scenarioCount: number;
    description: string;
    version: number;           // optimistic locking
}

interface SavedTestFull extends SavedTestMeta {
    definition: TestDefinition;
}
```

## Scheduled Test

```ts
interface ScheduledTest {
    id: string;
    testId: string;            // references SavedTestMeta.id
    testName: string;          // stale snapshot -- always look up current from savedTests
    app: string;
    savedSearchOrigin: string | null;
    cronSchedule: string;
    enabled: boolean;
    createdAt: string;
    createdBy: string;
    lastRunAt: string | null;
    lastRunStatus: 'passed' | 'failed' | 'error' | null;
    alertOnFailure: boolean;
    emailRecipients: string[];
    version: number;
}
```

## Test Run Record

```ts
interface TestRunRecord {
    id: string;
    scheduledTestId: string | null;  // null for manual runs
    testId: string;
    ranAt: string;
    ranBy: string;
    triggerType: 'scheduled' | 'manual';
    status: 'passed' | 'failed' | 'error';
    durationMs: number;
    splSnapshot: string;
    splDriftDetected: boolean;
    resultSummary: string;
    scenarioResults: object[];
}
```

## Root Store State (additions beyond slices)

```ts
savedTestId: string | null;           // currently loaded saved test (null = new)
savedTestVersion: number | null;      // version for optimistic locking
hasUnsavedChanges: boolean;           // auto-detected via store subscription
splDriftWarning: string | null;       // set by loadTestIntoBuilder on drift
```
