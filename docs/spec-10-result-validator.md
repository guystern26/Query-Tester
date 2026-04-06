# 10 — Result Validator (`result_validator.py`)

> **Conventions:** Follow `spec-00-conventions.md`. No Splunk calls. Use `CONDITION_HANDLERS` dict pattern (Open/Closed). Run ALL conditions — never short-circuit.

---

## What the Frontend Sends (Relevant to This File)

The `validation` object comes from the payload. The validator receives it plus the Splunk results rows:

```json
"validation": {
  "approach": "field_conditions",
  "fieldConditions": [
    { "field": "count",  "operator": "greater_than", "value": "0",  "scenarioScope": "all" },
    { "field": "src_ip", "operator": "not_empty",    "value": "",   "scenarioScope": "all" }
  ],
  "fieldLogic": "and",
  "resultCount": { "enabled": true, "operator": "greater_than", "value": 0 }
}
```

Note: frontend uses `"operator"` — the `PayloadParser` renames it to `condition` in the `FieldCondition` dataclass before it reaches this module.

---

## What the Frontend Expects Back (Per Scenario)

The frontend renders `scenarioResults[i].validations` as a list of pass/fail lines. Each `ValidationDetail` must have these exact keys:

```json
"validations": [
  { "field": "count",  "condition": "greater_than", "expected": "0", "actual": "3",  "passed": true,  "message": "count greater_than 0 ✓" },
  { "field": "src_ip", "condition": "not_empty",    "expected": "",  "actual": "10.0.0.1", "passed": true, "message": "src_ip not_empty ✓" }
]
```

If even one condition fails:
```json
{ "field": "count", "condition": "equals", "expected": "5", "actual": "3", "passed": false, "message": "count equals 5 — got 3 ✗" }
```

---

## Interface

```python
def validate(
    validation: ValidationConfig,
    scenario: Scenario,
    results: List[dict],
) -> Tuple[List[ValidationDetail], bool]:
    """
    Validate Splunk result rows against all conditions in the ValidationConfig.

    Returns (details, overall_passed).
    ALL conditions are evaluated — no short-circuit on first failure.
    """
```

---

## Validation Logic — Step by Step

```python
def validate(validation, scenario, results):
    details: List[ValidationDetail] = []
    all_passed = True

    # Step 1: result count check (if enabled) — always runs first
    if validation.result_count and validation.result_count.enabled:
        detail = _check_result_count(len(results), validation.result_count)
        details.append(detail)
        if not detail.passed:
            all_passed = False
        # DO NOT return — keep going even if count failed

    # Step 2: empty results with no count check → auto-fail
    if not results and (not validation.result_count or not validation.result_count.enabled):
        return [ValidationDetail(
            field='_results',
            condition='not_empty',
            expected='at least 1 result',
            actual='0 results',
            passed=False,
            message='No results returned. Check that indexed data matches your query filters.',
        )], False

    # Step 3: field conditions — ALL of them, no skipping
    if validation.approach == 'field_conditions' and validation.field_conditions:
        for condition in validation.field_conditions:
            # scenarioScope filtering: skip if condition doesn't apply to this scenario
            if not _scope_matches(condition.scenario_scope, scenario.name):
                continue
            detail = _check_field_condition(condition, results)
            details.append(detail)
            if not detail.passed:
                all_passed = False

    # Step 4: expected result JSON comparison
    elif validation.approach == 'expected_result' and validation.expected_result:
        detail = _check_expected_result(validation.expected_result, results)
        details.append(detail)
        if not detail.passed:
            all_passed = False

    return details, all_passed
```

---

## Field Condition Check

**A condition passes if ANY row in the results satisfies it** (not every row).

```python
def _check_field_condition(condition: FieldCondition, results: List[dict]) -> ValidationDetail:
    """Check one field condition against all result rows. Pass if any row satisfies it."""
    handler = CONDITION_HANDLERS.get(condition.condition)
    if handler is None:
        logger.warning('Unknown condition operator: %s', condition.condition)
        return ValidationDetail(
            field=condition.field, condition=condition.condition,
            expected=condition.value, actual='unknown operator',
            passed=False, message=f'Unknown operator "{condition.condition}" ✗',
        )

    actual_values = [str(row.get(condition.field, '')) for row in results]
    passed = any(handler(v, condition.value) for v in actual_values)

    # Show first 3 actual values in failure message
    display = actual_values[0] if len(actual_values) == 1 \
        else ', '.join(actual_values[:3]) + ('...' if len(actual_values) > 3 else '')

    message = (
        f'{condition.field} {condition.condition} {condition.value!r} ✓'
        if passed else
        f'{condition.field} {condition.condition} {condition.value!r} — got {display!r} ✗'
    )
    return ValidationDetail(
        field=condition.field, condition=condition.condition,
        expected=condition.value, actual=display,
        passed=passed, message=message,
    )
```

---

## Condition Handlers (Open/Closed Registry)

```python
CONDITION_HANDLERS: Dict[str, Callable[[str, str], bool]] = {
    'equals':     lambda a, e: a.strip().lower() == e.strip().lower(),
    'not_equals': lambda a, e: a.strip().lower() != e.strip().lower(),
    'contains':   lambda a, e: e.lower() in a.lower(),
    'regex':      lambda a, e: bool(re.search(e, a)),
    'not_empty':  lambda a, _: a is not None and a.strip() != '',
    'is_empty':   lambda a, _: a is None or a.strip() == '',
    'greater_than': lambda a, e: _safe_float(a) > _safe_float(e),
    'less_than':    lambda a, e: _safe_float(a) < _safe_float(e),
}

def _safe_float(value: str) -> float:
    """Convert to float for numeric comparisons. Returns 0.0 on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0
```

Add new operators by adding to this dict — never edit a condition chain.

---

## Result Count Check

```python
COUNT_OPS: Dict[str, Callable[[int, int], bool]] = {
    'equals':       lambda a, e: a == e,
    'greater_than': lambda a, e: a > e,
    'less_than':    lambda a, e: a < e,
}

def _check_result_count(actual: int, rc: ResultCount) -> ValidationDetail:
    """Check actual result count against the expected count rule."""
    op = COUNT_OPS.get(rc.operator, lambda a, e: False)
    passed = op(actual, rc.value)
    message = (
        f'result count {rc.operator} {rc.value} ✓'
        if passed else
        f'result count {rc.operator} {rc.value} — got {actual} ✗'
    )
    return ValidationDetail(
        field='_result_count', condition=rc.operator,
        expected=str(rc.value), actual=str(actual),
        passed=passed, message=message,
    )
```

---

## Concrete End-to-End Example

**Query results (2 rows):**
```python
results = [
    {'src_ip': '10.0.0.1', 'count': '3'},
    {'src_ip': '10.0.0.2', 'count': '7'},
]
```

**Validation config:**
```python
field_conditions = [
    FieldCondition(field='count',  condition='greater_than', value='0',  scenario_scope='all'),
    FieldCondition(field='src_ip', condition='not_empty',    value='',   scenario_scope='all'),
    FieldCondition(field='status', condition='equals',       value='ok', scenario_scope='all'),
]
result_count = ResultCount(enabled=True, operator='equals', value=3)
```

**Output details:**
```python
[
  ValidationDetail(field='_result_count', condition='equals',       expected='3', actual='2', passed=False, message='result count equals 3 — got 2 ✗'),
  ValidationDetail(field='count',         condition='greater_than', expected='0', actual='3', passed=True,  message="count greater_than '0' ✓"),
  ValidationDetail(field='src_ip',        condition='not_empty',    expected='', actual='10.0.0.1', passed=True, message="src_ip not_empty '' ✓"),
  ValidationDetail(field='status',        condition='equals',       expected='ok', actual='', passed=False, message="status equals 'ok' — got '' ✗"),
]
# overall_passed = False  (two conditions failed — ALL were still evaluated)
```

---

## ScenarioScope Filtering

The frontend can attach a condition to specific scenarios only:

```python
def _scope_matches(scope: Any, scenario_name: str) -> bool:
    """Return True if this condition should apply to this scenario."""
    if scope == 'all' or scope is None:
        return True
    if isinstance(scope, list):
        return scenario_name in scope
    return True
```

---

## Output Dataclass

```python
@dataclass
class ValidationDetail:
    """Result of evaluating one condition against the query results."""
    field: str        # field checked, or '_result_count' for count check
    condition: str    # operator name: equals, contains, greater_than, etc.
    expected: str     # expected value as string
    actual: str       # actual value found (first match or comma-joined sample)
    passed: bool
    message: str      # human-readable: 'count greater_than 0 ✓'
    error: Optional[str] = None
```
