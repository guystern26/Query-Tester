# 04 — The Run Loop (`test_runner.py`)

> **Conventions:** Follow `spec-00-conventions.md`. Every method has a docstring. Session key injected at construction. No `print()`.

This is the most critical file. It orchestrates all other modules. Keep it thin — it delegates everything, does nothing itself.

---

## What the Frontend Sends (Relevant to This File)

The frontend sends a POST body where scenarios are the unit of execution. Each scenario has its own inputs and the same shared query:

```json
{
  "testName": "Firewall Test",
  "testType": "standard",
  "app": "search",
  "query": "index=main sourcetype=firewall | stats count by src_ip",
  "scenarios": [
    { "name": "Normal Traffic", "inputs": [ { "rowIdentifier": "index=main sourcetype=firewall", "events": [...] } ] },
    { "name": "Attack Traffic", "inputs": [ { "rowIdentifier": "index=main sourcetype=firewall", "events": [...] } ] }
  ],
  "validation": { "approach": "field_conditions", "fieldConditions": [...] }
}
```

This translates to: run the **same SPL** twice — once for "Normal Traffic", once for "Attack Traffic" — each with different events indexed and a different `run_id` so the results stay isolated.

---

## The Loop — Full Pseudocode

```python
def run_test(self, raw_payload: dict) -> Tuple[dict, int]:
    """Parse payload, run each scenario independently, return response dict + HTTP status."""

    # 1. Parse once
    payload = PayloadParser.parse(raw_payload)

    # 2. Resolve SPL once — same base query for all scenarios
    spl = self._resolve_spl(payload)

    # 3. Analyze SPL once — warnings are shared across all scenarios
    analysis = self._analyzer.analyze(spl)

    scenario_results: List[ScenarioResult] = []

    # 4. Each scenario is independent — different run_id, different events
    for scenario in payload.scenarios:
        run_id = uuid4().hex[:8]                         # unique per scenario
        strategy = self._injector.detect_strategy(spl)

        try:
            # Expand generator rules → flat event list
            all_events: List[dict] = []
            for inp in scenario.inputs:
                all_events.extend(self._generator.build_events(inp))

            # Index events (skip for query_only or inputlookup)
            if payload.test_type != 'query_only' and strategy not in ('inputlookup', 'tstats'):
                self._indexer.index_events(all_events, run_id)

            # Create temp lookup CSV if needed
            if strategy == 'lookup':
                self._lookup.create_temp_lookup(run_id, all_events)

            # Rewrite SPL with this scenario's run_id
            injected_spl = self._injector.inject(spl, run_id, strategy, scenario.inputs)

            # Execute once — one query per scenario
            start_ms = int(time.time() * 1000)
            results = self._executor.run(injected_spl)
            elapsed_ms = int(time.time() * 1000) - start_ms

            # Validate ALL conditions — no short-circuit
            validations, passed = self._validator.validate(payload.validation, scenario, results)

            scenario_results.append(ScenarioResult(
                scenario_name=scenario.name,
                passed=passed,
                execution_time_ms=elapsed_ms,
                result_count=len(results),
                injected_spl=injected_spl,
                validations=validations,
                error=None,
            ))

        except Exception as exc:
            logger.error('Scenario "%s" failed: %s', scenario.name, exc, exc_info=True)
            scenario_results.append(ScenarioResult(
                scenario_name=scenario.name,
                passed=False,
                execution_time_ms=0,
                result_count=0,
                injected_spl='',
                validations=[],
                error=str(exc),
            ))

        finally:
            self._cleanup(run_id, strategy)    # always runs, even if exception thrown above

    # 5. Build response dict matching the exact keys the frontend reads
    return self._build_response(payload, analysis, scenario_results), 200
```

---

## Key Design Rules

- **One query per scenario** — all inputs in a scenario are indexed together, then the query runs once
- **Scenarios never share a `run_id`** — this is what isolates their indexed events
- **All validation conditions evaluated** — no short-circuit on first failure; the frontend shows all results
- **Cleanup always in `finally`** — even if indexing, execution, or validation threw
- **SPL resolved once** before the loop — not inside it

---

## Concrete Example: Two Scenarios

**Input:** 2 scenarios, both using `index=main | stats count by src_ip`

| Step | Scenario 1 ("Normal") | Scenario 2 ("Attack") |
|---|---|---|
| `run_id` | `a1b2c3d4` | `e5f6g7h8` |
| Events indexed | `{src_ip: "10.0.0.1"}`, `{src_ip: "10.0.0.2"}` | 50 generated IPs in 192.168.1.x |
| Injected SPL | `index=temp_query_tester run_id=a1b2c3d4 \| stats count by src_ip` | `index=temp_query_tester run_id=e5f6g7h8 \| stats count by src_ip` |
| Results | 2 rows | 50 rows |
| Validation | `count > 0` → pass | `count > 0` → pass, `src_ip not_empty` → pass |
| Cleanup | deletes `run_id=a1b2c3d4` | deletes `run_id=e5f6g7h8` |

---

## SPL Resolution

```python
def _resolve_spl(self, payload: TestPayload) -> str:
    """Resolve the SPL string from inline query or saved search name."""
    if payload.query and payload.query.strip():
        return payload.query.strip()

    if payload.saved_search_name:
        # splunklib returns entry[0].content — use object model, not raw JSON
        search = self._service.saved_searches[payload.saved_search_name]
        return search['search']

    raise ValueError(
        'Payload must include either a "query" field or "savedSearchName". '
        'Both were absent or empty.'
    )
```

---

## Cleanup

```python
def _cleanup(self, run_id: str, strategy: str) -> None:
    """Delete all temp data for this run. Errors are logged, never raised."""
    try:
        self._indexer.cleanup(run_id)
    except Exception as exc:
        logger.warning('Event cleanup failed for run_id=%s: %s', run_id, exc)

    if strategy == 'lookup':
        try:
            self._lookup.delete_temp_lookup(run_id)
        except Exception as exc:
            logger.warning('Lookup cleanup failed for run_id=%s: %s', run_id, exc)
```

---

## Response Building

The frontend reads these exact keys from the response. Do not rename them (see `spec-07-response.md`).

```python
def _build_response(
    self,
    payload: TestPayload,
    analysis: SPLAnalysis,
    scenario_results: List[ScenarioResult],
) -> dict:
    total  = len(scenario_results)
    passed = sum(1 for s in scenario_results if s.passed)

    if passed == total:
        status = 'success'
    elif passed == 0:
        status = 'error'
    else:
        status = 'partial'

    return {
        'status':          status,
        'message':         f'{passed}/{total} scenarios passed',
        'timestamp':       datetime.utcnow().isoformat() + 'Z',
        'testName':        payload.test_name,
        'testType':        payload.test_type,
        'totalScenarios':  total,
        'passedScenarios': passed,
        'warnings':        [w.__dict__ for w in analysis.warnings],
        'splAnalysis': {
            'unauthorizedCommands': analysis.unauthorized_commands,
            'unusualCommands':      analysis.unusual_commands,
            'uniqLimitations':      analysis.uniq_limitations,
            'commandsUsed':         analysis.commands_used,
        },
        'scenarioResults': [_scenario_result_to_dict(s) for s in scenario_results],
    }
```

---

## Fatal Error Response

When parsing fails or SPL can't be resolved — before the scenario loop runs:

```python
# Return this shape + HTTP 400 for client errors, 500 for server errors
{
    "status": "error",
    "message": "Saved search \"My Alert\" not found in app \"search\".",
    "scenarioResults": []
}
```
