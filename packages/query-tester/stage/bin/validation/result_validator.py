# -*- coding: utf-8 -*-
"""
result_validator.py
Validate Splunk query results against the configured validation rules.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from logger import get_logger
from core.models import (
    ParsedScenario,
    ValidationConfig,
    ValidationDetail,
)
from validation.condition_handlers import check_field_condition, check_result_count


logger = get_logger(__name__)


def validate(
    validation: ValidationConfig,
    scenario: ParsedScenario,
    results: List[Dict[str, Any]],
) -> Tuple[List[ValidationDetail], bool]:
    """
    Validate Splunk result rows against all conditions in the ValidationConfig.

    Returns (details, overall_passed).
    ALL conditions are evaluated -- no short-circuit on first failure.
    """
    details = []  # type: List[ValidationDetail]
    all_passed = True

    if validation.result_count and validation.result_count.enabled:
        count_detail = check_result_count(len(results), validation.result_count)
        details.append(count_detail)
        if not count_detail.passed:
            all_passed = False

    if not results and (not validation.result_count or not validation.result_count.enabled):
        no_result_detail = ValidationDetail(
            field="_results",
            operator="not_empty",
            expected="at least 1 result",
            actual="0 results",
            passed=False,
            message=(
                "No results returned. Check that indexed data matches your query filters."
            ),
        )
        return [no_result_detail], False

    scope = validation.validation_scope
    scope_n = validation.scope_n

    if validation.field_conditions:
        field_details = []  # type: List[ValidationDetail]
        for condition in validation.field_conditions:
            if not _scope_matches(condition.scenario_scope, scenario.name):
                continue
            detail = check_field_condition(condition, results, scope, scope_n)
            field_details.append(detail)

        details.extend(field_details)

        if validation.field_logic == "or":
            if field_details and not any(d.passed for d in field_details):
                all_passed = False
        else:
            if any(not d.passed for d in field_details):
                all_passed = False

    elif validation.expected_result:
        detail = _check_expected_result(validation.expected_result, results)
        details.append(detail)
        if not detail.passed:
            all_passed = False

    return details, all_passed


def _check_expected_result(
    expected: Dict[str, Any], results: List[Dict[str, Any]]
) -> ValidationDetail:
    if not results:
        message = "expected at least one row matching {0!r}, got 0 \u2717".format(
            expected
        )
        return ValidationDetail(
            field="_expected_result",
            operator="matches",
            expected=str(expected),
            actual="0 results",
            passed=False,
            message=message,
        )

    passed = any(_row_matches_expected(row, expected) for row in results)
    actual = str(results[0]) if results else ""
    if passed:
        message = "at least one row matched expected result \u2713"
    else:
        message = "no rows matched expected result {0!r} \u2717".format(expected)

    return ValidationDetail(
        field="_expected_result",
        operator="matches",
        expected=str(expected),
        actual=actual,
        passed=passed,
        message=message,
    )


def _row_matches_expected(row: Dict[str, Any], expected: Dict[str, Any]) -> bool:
    for key, value in expected.items():
        if str(row.get(key)) != str(value):
            return False
    return True


def _scope_matches(scope: Any, scenario_name: str) -> bool:
    if scope == "all" or scope is None:
        return True
    if isinstance(scope, list):
        return scenario_name in scope
    return True
