# 00 — Code Conventions & SOLID Principles

> **Attach this file to every Cursor prompt.** These rules apply to every Python file in the project.

---

## Python Version & Compatibility

**Python 3.7.** No exceptions. Splunk ships Python 3.7 on most enterprise versions.

```python
# CORRECT — Python 3.7 compatible
from typing import Optional, List, Dict, Tuple, Any, Callable
def parse(data: Optional[Dict[str, Any]]) -> List[str]: ...

# WRONG — Python 3.9+ syntax, breaks on Splunk
def parse(data: dict | None) -> list[str]: ...    # union types and built-in generics
x := compute()                                    # walrus operator
match status:                                     # match statement
```

---

## File Header — Every File, Exactly This Structure

```python
# -*- coding: utf-8 -*-
"""
module_name.py
One-line description of what this module does and nothing else.
"""
from __future__ import annotations

# 1. stdlib
import os
import re
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple
from uuid import uuid4

# 2. third-party (splunklib only — no pip installs on closed network)
import splunklib.client as splunk_client
import splunklib.results as splunk_results

# 3. local modules
from logger import get_logger

logger = get_logger(__name__)
```

`from __future__ import annotations` must be the **first non-comment line** after the module docstring. It enables PEP 563 forward references in type hints for Python 3.7.

The shebang `#!/usr/bin/env python3` goes on `query_tester.py` only.

---

## Naming Conventions

| Thing | Style | Example |
|---|---|---|
| Module-level constants | `UPPER_SNAKE_CASE` | `BATCH_SIZE = 1000`, `UNAUTHORIZED_COMMANDS` |
| Classes | `PascalCase` | `QueryInjector`, `ResultValidator` |
| Public functions / methods | `snake_case` | `detect_strategy()`, `build_events()` |
| Private helpers | `_snake_case` | `_replace_index()`, `_normalize_weights()` |
| Dataclass fields | `snake_case` | `row_identifier`, `event_count`, `field_logic` |
| Local variables | `snake_case` | `run_id`, `injected_spl`, `all_events` |
| Type aliases | `PascalCase` | `EventRow = Dict[str, str]` |

---

## SOLID — Applied Concretely

### S — Single Responsibility: One File, One Job

```python
# CORRECT — query_injector.py only transforms SPL strings
class QueryInjector:
    def inject(self, spl: str, run_id: str, strategy: str) -> str: ...
    def detect_strategy(self, spl: str) -> str: ...
    def _replace_outer_index(self, spl: str, run_id: str) -> str: ...

# WRONG — injector reaching into execution territory
class QueryInjector:
    def inject(self, spl: str, run_id: str) -> str: ...
    def run_query(self, spl: str) -> List[dict]: ...      # ← belongs in query_executor.py
    def cleanup(self, run_id: str) -> None: ...           # ← belongs in data_indexer.py
```

Boundary check: if you're about to `import QueryExecutor` inside `QueryInjector`, stop — you've crossed a boundary.

### O — Open/Closed: Registries, Not if/elif Chains

When a function dispatches on a string value (generator type, condition operator, injection strategy), use a dict registry. Adding a new variant means adding one line to the dict — not editing existing logic.

```python
# CORRECT — open to extension, closed to modification
CONDITION_HANDLERS: Dict[str, Callable[[str, str], bool]] = {
    'equals':    lambda actual, expected: actual.strip().lower() == expected.strip().lower(),
    'contains':  lambda actual, expected: expected.lower() in actual.lower(),
    'regex':     lambda actual, expected: bool(re.search(expected, actual)),
    'not_empty': lambda actual, _: actual is not None and actual.strip() != '',
}

def check_condition(operator: str, actual: str, expected: str) -> bool:
    handler = CONDITION_HANDLERS.get(operator)
    if handler is None:
        logger.warning('Unknown condition operator: %s — skipping', operator)
        return False
    return handler(actual, expected)

# WRONG — must edit the function to add a new operator
def check_condition(operator: str, actual: str, expected: str) -> bool:
    if operator == 'equals':
        return actual.lower() == expected.lower()
    elif operator == 'contains':
        return expected.lower() in actual.lower()
    elif operator == 'regex':
        return bool(re.search(expected, actual))
    # adding 'starts_with' means editing here
```

Apply this pattern to:
- `event_generator.py` → `GENERATOR_REGISTRY`
- `result_validator.py` → `CONDITION_HANDLERS`
- `query_injector.py` → `STRATEGY_HANDLERS`

### I — Interface Segregation: Pass Only What's Needed

```python
# CORRECT — takes only the two values it needs
def _replace_outer_index(self, spl: str, run_id: str) -> str:
    replacement = f'index=temp_query_tester run_id={run_id}'
    return INDEX_PATTERN.sub(replacement, spl, count=1)

# WRONG — takes the entire payload object when it only needs the SPL string
def _replace_outer_index(self, payload: TestPayload) -> str:
    replacement = f'index=temp_query_tester run_id={payload.scenarios[0].run_id}'
    return INDEX_PATTERN.sub(replacement, payload.query, count=1)
```

`TestPayload` and `Scenario` dataclasses cross module boundaries at the `TestRunner` level. Individual helper functions receive only the specific primitives they act on.

### D — Dependency Inversion: Inject, Don't Hardcode

```python
# CORRECT — session_key injected at construction, all services created from it
class TestRunner:
    def __init__(self, session_key: str) -> None:
        self._session_key = session_key
        self._executor = QueryExecutor(session_key)
        self._indexer  = DataIndexer(session_key)
        self._analyzer = SPLAnalyzer()
        self._injector = QueryInjector()
        self._validator = ResultValidator()

# WRONG — global service at module level, TestRunner implicitly depends on it
_splunk_service = splunk_client.connect(host='localhost', port=8089, ...)

class TestRunner:
    def run_test(self, payload: TestPayload) -> dict:
        results = _splunk_service.jobs.create(...)    # hidden dependency
```

---

## No `print()` — Ever

Splunk's REST handler reads **stdout as part of the HTTP response body**. A single `print()` anywhere in the call stack corrupts the JSON the frontend receives, producing a silent failure.

```python
# CORRECT — goes to log file, never stdout
logger.info('Indexed %d events for run_id=%s', len(events), run_id)
logger.warning('Cleanup failed for run_id=%s: %s', run_id, str(e))
logger.error('Scenario failed', exc_info=True)    # exc_info=True includes traceback

# WRONG — corrupts the REST response
print(f'Indexed {len(events)} events')
print(results)
```

This applies to: debug prints, logging.basicConfig, exception tracebacks via traceback.print_exc(), and any third-party library that defaults to stdout. Redirect or suppress all of them.

---

## Error Handling Patterns

### Per-scenario errors must not stop the run

```python
for scenario in payload.scenarios:
    try:
        result = self._run_scenario(spl, scenario)
    except Exception as exc:
        logger.error('Scenario "%s" failed: %s', scenario.name, exc, exc_info=True)
        result = ScenarioResult(
            scenario_name=scenario.name,
            passed=False,
            execution_time_ms=0,
            result_count=0,
            injected_spl='',
            validations=[],
            error=str(exc),
        )
    scenario_results.append(result)
    # loop always continues to the next scenario
```

### Cleanup must run even on exception

```python
run_id = uuid4().hex[:8]
strategy = self._injector.detect_strategy(spl)
try:
    result = self._execute_scenario(spl, run_id, strategy, scenario)
finally:
    self._cleanup(run_id, strategy)   # always — even if _execute_scenario raised
```

### Error messages must be actionable

```python
# CORRECT — tells user what failed and what to do
raise ValueError(
    f'Saved search "{name}" not found in app "{app}". '
    f'Verify the app selector matches the search\'s app context.'
)

# WRONG — useless to the user
raise ValueError('Not found')
raise Exception('Error in payload parser')
```

### Never raise on unknown enum values from the frontend

The frontend may evolve faster than the backend. Unknown string values should log a warning and return a safe default, never crash:

```python
handler = CONDITION_HANDLERS.get(operator)
if handler is None:
    logger.warning('Unknown operator "%s" — condition will be skipped', operator)
    return False
```

---

## Dataclass Conventions

All structured data passed between modules must be a `@dataclass` — not a plain `dict`.

```python
@dataclass
class ValidationDetail:
    """Result of evaluating one field condition against the query results."""
    field: str              # field name that was checked
    condition: str          # operator used (equals, contains, etc.)
    expected: str           # expected value as a string
    actual: str             # actual value found in results (or 'no results')
    passed: bool
    message: str            # human-readable: 'count equals 5 ✓'
    error: Optional[str] = None   # optional fields with defaults go last
```

Rules:
- Required fields first, `Optional` / defaulted fields last
- `Optional[X]` fields default to `None`
- `List[X]` fields use `field(default_factory=list)` — not `= None` and not `= []`
- One dataclass per distinct concept — no reusing a dict as a return value
- Add a one-line docstring describing the purpose of each dataclass

---

## Generic / Data-Driven Patterns

Prefer data-driven design over hard-coded logic branches. The three places in this project where this applies:

```python
# event_generator.py
GENERATOR_REGISTRY: Dict[str, Callable] = {
    'numbered':      _gen_numbered,
    'pick_list':     _gen_pick_list,
    'random_number': _gen_random_number,
    'unique_id':     _gen_unique_id,
    'email':         _gen_email,
    'ip_address':    _gen_ip_address,
    'general_field': _gen_pick_list,   # alias — same function
}

# result_validator.py
CONDITION_HANDLERS: Dict[str, Callable[[str, str], bool]] = {
    'equals':    lambda a, e: a.strip().lower() == e.strip().lower(),
    'contains':  lambda a, e: e.lower() in a.lower(),
    'regex':     lambda a, e: bool(re.search(e, a)),
    'not_empty': lambda a, _: a is not None and a.strip() != '',
}

# query_injector.py
STRATEGY_HANDLERS: Dict[str, Callable] = {
    'standard':    _inject_standard,
    'lookup':      _inject_lookup,
    'inputlookup': _inject_noop,
    'tstats':      _inject_noop,
    'no_index':    _inject_prepend,
}
```

---

## Line Length, Formatting, Comments

- Max line length: **100 characters**
- Backslash continuation for strings longer than one line — not implicit parenthesis continuation
- Every non-obvious block of logic gets a one-line comment above it
- No clever one-liners. Readable > short.

```python
# CORRECT — clear intent
# Replace only the outer index= — leave subsearch brackets untouched
bracket_pos = spl.find('[')
outer = spl[:bracket_pos] if bracket_pos != -1 else spl
inner = spl[bracket_pos:] if bracket_pos != -1 else ''
result = _replace_index_in_segment(outer, run_id) + inner

# WRONG — clever, illegible
result = _r(spl[:spl.find('[')]if'['in spl else spl,r)+(spl[spl.find('['):]if'['in spl else'')
```
