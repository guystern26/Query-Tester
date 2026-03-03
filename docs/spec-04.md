### 4. The Unified Data Model


**4.1 Enums & IDs**
```
type EntityId = string;  // crypto.randomUUID()
type TestType = 'standard' | 'query_only';
type ValidationType = 'standard' | 'ijump_alert';
type InputMode = 'json' | 'fields' | 'no_events';
type ConditionOperator = 'equals' | 'contains' | 'regex' | 'not_empty';
type ResultCountOperator = 'equals' | 'greater_than' | 'less_than';
```

**4.2 InputMode: Three States**
**'json' | 'fields' | 'no_events'**
**json: **User types/pastes JSON. Stored as raw string in jsonContent.
**fields: **Structured events with field-value pairs. Multiple events per input.
**no_events: **The row identifier returns 0 events. Payload sends data: [{}]. Backend generates makeresults count=0. UI hides editor, shows 'This input returns 0 events' message.

**4.3 Complete Type Hierarchy**

**FieldValue**
```
interface FieldValue {
id: EntityId;
field: string;       // must be filled if value is non-empty or generator is used
value: string;       // can be empty string ''. Distinguish '' from ' ' (space is valid)
}
```

**InputEvent**
```
interface InputEvent {
id: EntityId;
fieldValues: FieldValue[];
}
```

**TestInput**
```
interface TestInput {
id: EntityId;
rowIdentifier: string;
inputMode: InputMode;               // 'json' | 'fields' | 'no_events'
jsonContent: string;                 // raw string, parsed only at payload build
events: InputEvent[];
fileRef: { name: string; size: number } | null;  // metadata only
generatorConfig: GeneratorConfig;
}
```

**Scenario**
```
interface Scenario {
id: EntityId;
name: string;
description: string;
inputs: TestInput[];
}
```

**QueryConfig**
```
interface QueryConfig {
spl: string;
savedSearchOrigin: string | null;
}
```

**FieldCondition**
```
interface FieldCondition {
id: EntityId;
field: string;
operator: ConditionOperator;
value: string;
scenarioScope: 'all' | EntityId[];
}
```

**ValidationConfig**
```
interface ValidationConfig {
validationType: ValidationType;      // 'standard' | 'ijump_alert'
approach: 'expected_result' | 'field_conditions';
expectedResultJson: string;
expectedResultFileRef: { name: string; size: number } | null;
fieldConditions: FieldCondition[];
resultCount: ResultCountRule;
}
```

**TestDefinition**
```
interface TestDefinition {
id: EntityId;
name: string;
app: string;                        // Splunk app context
testType: TestType;                 // 'standard' | 'query_only'
scenarios: Scenario[];
query: QueryConfig;
validation: ValidationConfig;
}
```