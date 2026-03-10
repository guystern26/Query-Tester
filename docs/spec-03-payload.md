# 03 — Payload: Frontend Contract + Python Dataclasses

---

## Frontend Architecture (Context for Backend)

The frontend is React 16 + Zustand. The state hierarchy is:
```
TestDefinition
  └── scenarios: Scenario[]
        └── inputs: TestInput[]
              └── events: InputEvent[]
                    └── fieldValues: FieldValue[]
```

`utils/payloadBuilder.ts` (`buildPayload()`) is the **single function** that serializes state into the POST body. The backend receives exactly what this function produces — no preprocessing on the frontend side.

Request goes to:
```
POST /splunkd/__raw/services/splunk_query_tester/query_tester
Content-Type: application/json
```

---

## Real Payload — From `buildPayload()` in Frontend

This is the **exact structure** the backend must accept:

```json
{
  "testName": "My Firewall Test",
  "app": "search",
  "testType": "standard",
  "query": "index=main sourcetype=firewall | stats count by src_ip",

  "scenarios": [
    {
      "name": "Normal Traffic",
      "inputs": [
        {
          "rowIdentifier": "index=main sourcetype=firewall",
          "events": [
            { "src_ip": "10.0.0.1", "action": "allowed", "bytes": "1024" },
            { "src_ip": "10.0.0.2", "action": "allowed", "bytes": "2048" }
          ],
          "generatorConfig": null
        }
      ]
    },
    {
      "name": "Attack Scenario",
      "inputs": [
        {
          "rowIdentifier": "index=main sourcetype=firewall",
          "events": [
            { "src_ip": "192.168.1.99", "action": "blocked", "bytes": "0" }
          ],
          "generatorConfig": {
            "enabled": true,
            "eventCount": 50,
            "rules": [
              {
                "id": "rule-1",
                "fieldName": "src_ip",
                "generationType": "ip_address",
                "config": { "subnet": "192.168.1" }
              }
            ]
          }
        }
      ]
    }
  ],

  "validation": {
    "validationType": "standard",
    "approach": "field_conditions",
    "expectedResult": null,
    "fieldConditions": [
      {
        "field": "count",
        "operator": "greater_than",
        "value": "0",
        "scenarioScope": "all"
      },
      {
        "field": "src_ip",
        "operator": "not_empty",
        "value": "",
        "scenarioScope": ["uuid-scenario-2"]
      }
    ],
    "fieldLogic": "and",
    "validationScope": "any_event",
    "scopeN": null,
    "resultCount": {
      "enabled": true,
      "operator": "greater_than",
      "value": 0
    }
  }
}
```

### `query_only` test — no scenarios key

When `testType == "query_only"`, `scenarios` is **absent** (undefined, not `null`).
Backend must handle missing `scenarios` gracefully.

```json
{
  "testName": "SPL Logic Check",
  "app": "search",
  "testType": "query_only",
  "query": "| makeresults count=10 | eval host=\"test\" | stats count by host",
  "validation": {
    "approach": "field_conditions",
    "fieldConditions": [{ "field": "count", "operator": "equals", "value": "10", "scenarioScope": "all" }],
    "resultCount": null
  }
}
```

---

## Key Field Notes

| Field | Type | Notes |
|---|---|---|
| `testType` | `"standard" \| "query_only"` | `query_only` → no scenarios sent |
| `query` | string | Always the raw SPL. The frontend always sends the current editor value. |
| `inputs[].rowIdentifier` | string | The **full** search string — e.g. `"index=main sourcetype=fw"`. Replace this whole string, not just `index=`. |
| `inputs[].events` | `dict[]` | Each dict is one event to index. Already flattened by `buildEventsForInput()`. |
| `generatorConfig` | object or `null` | `null` when disabled. Only present when `enabled: true`. |
| `validation.approach` | string | Frontend uses `approach`, not `mode`. Map to `mode` in your dataclass if preferred. |
| `validation.fieldConditions[].operator` | string | Frontend calls it `operator`. Backend should store as `condition` internally. |
| `validation.fieldConditions[].scenarioScope` | `"all"` or `string[]` | `"all"` = apply to every scenario. Array of IDs = only those scenarios. |
| `validation.fieldLogic` | `"and" \| "or"` | Whether ALL field conditions must pass or ANY one suffices. |
| `validation.resultCount` | object or `null` | `null` when disabled — skip count check entirely. |

---

## Normalization Rules (in `payload_parser.py`)

Handle these before building dataclasses:

| Situation | Action |
|---|---|
| `scenarios` key absent or `null` | Empty list — no events to index |
| `generatorConfig` is `null` | Disabled generator — use `events` list as-is |
| `validation.fieldConditions` is `null` | No field conditions |
| `validation.resultCount` is `null` | Skip result count check |
| `input.events` is `[]` | Skip indexing for this input |
| `input.events` is `[{}]` | `no_events` mode from frontend — skip indexing |

---

## Python Dataclasses (all in `payload_parser.py`)

Note: frontend uses camelCase, Python uses snake_case. Mapping is explicit below.

```python
# --- Validation ---

@dataclass
class FieldCondition:
    field: str
    condition: str       # from frontend "operator" field — renamed on parse
    value: str
    scenario_scope: Any  # "all" or List[str] of scenario IDs

@dataclass
class ResultCount:
    enabled: bool
    operator: str        # 'equals' | 'greater_than' | 'less_than'
    value: int

@dataclass
class ValidationConfig:
    approach: str                          # 'expected_result' | 'field_conditions'
    validation_type: str                   # 'standard' | 'ijump_alert'
    expected_result: Optional[dict]
    field_conditions: Optional[List[FieldCondition]]
    field_logic: str                       # 'and' | 'or'
    validation_scope: str                  # 'any_event' | 'all_events' etc.
    result_count: Optional[ResultCount]

# --- Generator ---

@dataclass
class GeneratorRule:
    id: str
    field_name: str      # from frontend "fieldName"
    generation_type: str # from frontend "generationType"
    config: dict

@dataclass
class GeneratorConfig:
    enabled: bool
    event_count: int     # from frontend "eventCount"
    rules: List[GeneratorRule]

# --- Inputs / Scenarios ---

@dataclass
class ParsedInput:
    row_identifier: str            # from frontend "rowIdentifier"
    events: List[dict]             # already flat — each dict is one event row
    generator_config: Optional[GeneratorConfig]

@dataclass
class Scenario:
    name: str
    inputs: List[ParsedInput]

# --- Top Level ---

@dataclass
class TestPayload:
    test_name: str                 # from frontend "testName"
    test_type: str                 # 'standard' | 'query_only'
    app: str
    query: str
    scenarios: List[Scenario]      # empty for query_only
    validation: ValidationConfig
```

---

## Full camelCase → snake_case Mapping

```
testName            → test_name
testType            → test_type
app                 → app
query               → query
scenarios[]
  .name             → name
  .inputs[]
    .rowIdentifier  → row_identifier
    .events[]       → events (list of flat dicts)
    .generatorConfig
      .enabled      → enabled
      .eventCount   → event_count
      .rules[]
        .id         → id
        .fieldName  → field_name
        .generationType → generation_type
        .config     → config
validation
  .validationType   → validation_type
  .approach         → approach
  .expectedResult   → expected_result
  .fieldConditions[]
    .field          → field
    .operator       → condition       ← renamed
    .value          → value
    .scenarioScope  → scenario_scope
  .fieldLogic       → field_logic
  .validationScope  → validation_scope
  .resultCount
    .enabled        → enabled
    .operator       → operator
    .value          → value
```

---

## What the Frontend Reads Back

The frontend `ResultsPanel` renders `response.scenarioResults`. If keys are missing or renamed, the UI silently shows nothing. Full shape in `spec-07-response.md`.

Minimal example that the frontend will render correctly:

```json
{
  "status": "partial",
  "message": "1/2 scenarios passed",
  "totalScenarios": 2,
  "passedScenarios": 1,
  "warnings": [],
  "splAnalysis": { "unauthorizedCommands": [], "unusualCommands": [], "uniqLimitations": null, "commandsUsed": ["stats"] },
  "scenarioResults": [
    {
      "scenarioName": "Normal Traffic",
      "passed": true,
      "executionTimeMs": 210,
      "resultCount": 3,
      "injectedSpl": "index=temp_query_tester run_id=abc123 sourcetype=firewall | stats count by src_ip",
      "validations": [
        { "field": "count", "condition": "greater_than", "expected": "0", "actual": "3", "passed": true, "message": "count greater_than 0 ✓" }
      ],
      "error": null
    }
  ]
}
```
