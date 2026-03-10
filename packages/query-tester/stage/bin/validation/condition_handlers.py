# -*- coding: utf-8 -*-
"""
condition_handlers.py
Condition handler registries and per-condition check functions.
"""
from __future__ import annotations

import re
from typing import Any, Callable, Dict, List, Optional

from logger import get_logger
from core.helpers import safe_float
from core.models import FieldCondition, ResultCount, ValidationDetail


logger = get_logger(__name__)

ConditionHandler = Callable[[str, str], bool]

CONDITION_HANDLERS: Dict[str, ConditionHandler] = {
    "equals": lambda a, e: a.strip().lower() == e.strip().lower(),
    "not_equals": lambda a, e: a.strip().lower() != e.strip().lower(),
    "contains": lambda a, e: e.lower() in a.lower(),
    "not_contains": lambda a, e: e.lower() not in a.lower(),
    "regex": lambda a, e: bool(re.search(e, a)),
    "greater_than": lambda a, e: safe_float(a) > safe_float(e),
    "less_than": lambda a, e: safe_float(a) < safe_float(e),
    "greater_or_equal": lambda a, e: safe_float(a) >= safe_float(e),
    "less_or_equal": lambda a, e: safe_float(a) <= safe_float(e),
    "is_empty": lambda a, _: a is None or a.strip() == "",
    "is_not_empty": lambda a, _: a is not None and a.strip() != "",
    "not_empty": lambda a, _: a is not None and a.strip() != "",
    "in_list": lambda a, e: a.strip() in [v.strip() for v in e.split(",")],
}

COUNT_OPS: Dict[str, Callable[[int, int], bool]] = {
    "equals": lambda a, e: a == e,
    "greater_than": lambda a, e: a > e,
    "less_than": lambda a, e: a < e,
    "greater_or_equal": lambda a, e: a >= e,
    "less_or_equal": lambda a, e: a <= e,
}


# ── Scope descriptions for human-readable messages ──────────────────────────

_SCOPE_LABELS = {
    "all_events": "all events",
    "any_event": "at least one event",
    "exactly_n": "exactly {n} event(s)",
    "at_least_n": "at least {n} event(s)",
    "at_most_n": "at most {n} event(s)",
}


def check_field_condition(
    condition: FieldCondition,
    results: List[Dict[str, Any]],
    validation_scope: str = "any_event",
    scope_n: Optional[int] = None,
) -> ValidationDetail:
    """Evaluate one field condition against result rows, respecting validation scope."""
    handler = CONDITION_HANDLERS.get(condition.operator)
    if handler is None:
        logger.warning("Unknown condition operator: %s", condition.operator)
        return ValidationDetail(
            field=condition.field,
            operator=condition.operator,
            expected=condition.value,
            actual="unknown operator",
            passed=False,
            message='Unknown operator "{0}" \u2717'.format(condition.operator),
        )

    actual_values = [str(row.get(condition.field, "")) for row in results]
    per_row = [handler(value, condition.value) for value in actual_values]

    # Apply scope logic
    match_count = sum(per_row)
    total_count = len(per_row)
    passed = _evaluate_scope(per_row, validation_scope, scope_n)

    # Build display string
    if not actual_values:
        display = ""
    elif len(actual_values) == 1:
        display = actual_values[0]
    else:
        sample = actual_values[:3]
        display = ", ".join(sample)
        if len(actual_values) > 3:
            display = display + "..."

    scope_label = _SCOPE_LABELS.get(validation_scope, validation_scope)
    if scope_n is not None:
        scope_label = scope_label.replace("{n}", str(scope_n))

    failed_count = total_count - match_count
    cond_human = condition.operator.replace("_", " ")

    if passed:
        message = "All {0} results matched: {1} {2} \u2713".format(
            total_count, condition.field, cond_human,
        )
    else:
        message = "{0} of {1} results failed: {2} was not {3} \u2014 expected {4} \u2717".format(
            failed_count, total_count, condition.field, cond_human, scope_label,
        )

    return ValidationDetail(
        field=condition.field,
        operator=condition.operator,
        expected=condition.value,
        actual=display,
        passed=passed,
        message=message,
    )


def _evaluate_scope(
    per_row: List[bool],
    validation_scope: str,
    scope_n: Optional[int],
) -> bool:
    """Decide pass/fail based on per-row results and the validation scope."""
    if not per_row:
        return False

    match_count = sum(per_row)

    if validation_scope == "all_events":
        return all(per_row)

    if validation_scope == "any_event":
        return any(per_row)

    n = scope_n if scope_n is not None else 0

    if validation_scope == "exactly_n":
        return match_count == n

    if validation_scope == "at_least_n":
        return match_count >= n

    if validation_scope == "at_most_n":
        return match_count <= n

    # Default: any_event
    return any(per_row)


def check_result_count(actual: int, rc: ResultCount) -> ValidationDetail:
    """Evaluate a result count condition."""
    op = COUNT_OPS.get(rc.operator)
    if op is None:
        logger.warning("Unknown resultCount operator: %s", rc.operator)
        passed = False
    else:
        passed = op(actual, rc.value)

    if passed:
        message = "result count {0} {1} \u2713".format(rc.operator, rc.value)
    else:
        message = "result count {0} {1} \u2014 got {2} \u2717".format(
            rc.operator, rc.value, actual
        )

    return ValidationDetail(
        field="_result_count",
        operator=rc.operator,
        expected=str(rc.value),
        actual=str(actual),
        passed=passed,
        message=message,
    )
