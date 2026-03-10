# 07 — Response Shape

> The frontend `ResultsPanel` and `ScenarioResultCard` components read these exact keys.
> **Do not rename any key.** A renamed key causes silent UI failure — the component renders nothing.

---

## Why Key Names Are Locked

The frontend TypeScript reads the response as a typed `TestResponse` interface. The property names are hardcoded in the component. For example:

```typescript
// From ResultsPanel.tsx — reads these exact keys:
response.scenarioResults.forEach(s => {
    s.scenarioName      // NOT "name" or "scenario_name"
    s.passed            // NOT "pass" or "isPassed"
    s.executionTimeMs   // NOT "execution_time" or "elapsed"
    s.injectedSpl       // NOT "spl" or "injected_query"
    s.validations.forEach(v => {
        v.field         // v.condition  v.expected  v.actual  v.passed  v.message
    })
})
```

The backend serializes Python dataclasses to camelCase JSON. Use a `_to_dict()` helper — never `dataclasses.asdict()` which produces snake_case.

---

## Full Response Shape

```json
{
  "status": "partial",
  "message": "1/2 scenarios passed",
  "timestamp": "2024-01-15T10:30:00Z",
  "testName": "Firewall Test",
  "testType": "standard",
  "totalScenarios": 2,
  "passedScenarios": 1,

  "warnings": [
    { "message": "join limited to 50,000 results", "severity": "warning" }
  ],

  "splAnalysis": {
    "unauthorizedCommands": [],
    "unusualCommands": ["join"],
    "uniqLimitations": null,
    "commandsUsed": ["stats", "join"]
  },

  "scenarioResults": [
    {
      "scenarioName": "Normal Traffic",
      "passed": true,
      "executionTimeMs": 234,
      "resultCount": 3,
      "injectedSpl": "index=temp_query_tester run_id=a1b2c3d4 sourcetype=firewall | stats count by src_ip",
      "validations": [
        {
          "field": "count",
          "condition": "greater_than",
          "expected": "0",
          "actual": "3",
          "passed": true,
          "message": "count greater_than '0' ✓"
        },
        {
          "field": "_result_count",
          "condition": "greater_than",
          "expected": "0",
          "actual": "3",
          "passed": true,
          "message": "result count greater_than 0 ✓"
        }
      ],
      "error": null
    },
    {
      "scenarioName": "Attack Traffic",
      "passed": false,
      "executionTimeMs": 187,
      "resultCount": 0,
      "injectedSpl": "index=temp_query_tester run_id=e5f6g7h8 sourcetype=firewall | stats count by src_ip",
      "validations": [],
      "error": "No results returned. Check that indexed data matches your query filters."
    }
  ]
}
```

---

## Status Logic

| `status` | Condition |
|---|---|
| `"success"` | `passedScenarios == totalScenarios` |
| `"partial"` | `0 < passedScenarios < totalScenarios` |
| `"error"` | `passedScenarios == 0` OR fatal error before loop |

---

## Fatal Error Response (before scenario loop)

Return HTTP 400 for client errors (bad payload, saved search not found), HTTP 500 for unexpected errors:

```json
{
  "status": "error",
  "message": "Saved search \"My Alert\" not found in app \"search\".",
  "scenarioResults": []
}
```

---

## Serialization Helper

Write an explicit `_to_dict` helper. **Do not use `dataclasses.asdict()`** — it produces `snake_case` keys which the frontend does not read.

```python
def _scenario_result_to_dict(result: ScenarioResult) -> dict:
    return {
        'scenarioName':    result.scenario_name,
        'passed':          result.passed,
        'executionTimeMs': result.execution_time_ms,
        'resultCount':     result.result_count,
        'injectedSpl':     result.injected_spl,
        'validations':     [_validation_detail_to_dict(v) for v in result.validations],
        'error':           result.error,
    }

def _validation_detail_to_dict(detail: ValidationDetail) -> dict:
    return {
        'field':     detail.field,
        'condition': detail.condition,
        'expected':  detail.expected,
        'actual':    detail.actual,
        'passed':    detail.passed,
        'message':   detail.message,
    }
```

---

## Key Reference

| JSON key | Python source | Type |
|---|---|---|
| `status` | computed: `'success'/'partial'/'error'` | string |
| `message` | `f"{passed}/{total} scenarios passed"` | string |
| `timestamp` | `datetime.utcnow().isoformat() + 'Z'` | string |
| `testName` | `payload.test_name` | string |
| `testType` | `payload.test_type` | string |
| `totalScenarios` | `len(scenario_results)` | int |
| `passedScenarios` | `sum(s.passed for s in ...)` | int |
| `warnings` | `analysis.warnings` (list of dicts) | array |
| `splAnalysis.unauthorizedCommands` | `analysis.unauthorized_commands` | array |
| `splAnalysis.unusualCommands` | `analysis.unusual_commands` | array |
| `splAnalysis.uniqLimitations` | `analysis.uniq_limitations` | string or null |
| `splAnalysis.commandsUsed` | `analysis.commands_used` | array |
| `scenarioResults[].scenarioName` | `ScenarioResult.scenario_name` | string |
| `scenarioResults[].passed` | `ScenarioResult.passed` | bool |
| `scenarioResults[].executionTimeMs` | `ScenarioResult.execution_time_ms` | int |
| `scenarioResults[].resultCount` | `ScenarioResult.result_count` | int |
| `scenarioResults[].injectedSpl` | `ScenarioResult.injected_spl` | string |
| `scenarioResults[].validations` | `ScenarioResult.validations` | array |
| `scenarioResults[].error` | `ScenarioResult.error` | string or null |
| `validations[].field` | `ValidationDetail.field` | string |
| `validations[].condition` | `ValidationDetail.condition` | string |
| `validations[].expected` | `ValidationDetail.expected` | string |
| `validations[].actual` | `ValidationDetail.actual` | string |
| `validations[].passed` | `ValidationDetail.passed` | bool |
| `validations[].message` | `ValidationDetail.message` | string |
