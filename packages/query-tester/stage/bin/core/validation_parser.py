# -*- coding: utf-8 -*-
"""
validation_parser.py
Parse the validation section of the frontend payload into typed dataclasses.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from logger import get_logger
from core.models import FieldCondition, ResultCount, ValidationConfig


logger = get_logger(__name__)


def parse_validation(raw: Dict[str, Any]) -> ValidationConfig:
    """Parse the validation block of a payload into a ValidationConfig."""
    validation_type = _get_str(raw, "validationType", "standard")
    expected_result = raw.get("expectedResult")
    if expected_result is not None and not isinstance(expected_result, dict):
        logger.warning(
            'Expected "validation.expectedResult" to be an object or null; '
            "received %s. Coercing to None.",
            type(expected_result).__name__,
        )
        expected_result = None

    field_conditions_raw = raw.get("fieldConditions")
    if field_conditions_raw is None:
        field_conditions = None  # type: Optional[List[FieldCondition]]
    else:
        if not isinstance(field_conditions_raw, list):
            logger.warning(
                'Expected "validation.fieldConditions" to be a list or null; '
                "received %s. Treating as no field conditions.",
                type(field_conditions_raw).__name__,
            )
            field_conditions = None
        else:
            field_conditions = []
            for condition_obj in field_conditions_raw:
                if not isinstance(condition_obj, dict):
                    logger.warning(
                        "Skipping non-object field condition of type %s.",
                        type(condition_obj).__name__,
                    )
                    continue
                field_conditions.append(_parse_field_condition(condition_obj))

    field_logic = _get_str(raw, "fieldLogic", "and")
    validation_scope = _get_str(raw, "validationScope", "any_event")

    scope_n_raw = raw.get("scopeN")
    scope_n = None  # type: Optional[int]
    if scope_n_raw is not None:
        try:
            scope_n = int(scope_n_raw)
        except (TypeError, ValueError):
            logger.warning(
                'Expected "validation.scopeN" to be numeric; '
                "received %s. Ignoring.",
                type(scope_n_raw).__name__,
            )

    result_count_raw = raw.get("resultCount")
    if result_count_raw is None:
        result_count = None  # type: Optional[ResultCount]
    else:
        if not isinstance(result_count_raw, dict):
            logger.warning(
                'Expected "validation.resultCount" to be an object or null; '
                "received %s. Skipping result count check.",
                type(result_count_raw).__name__,
            )
            result_count = None
        else:
            result_count = _parse_result_count(result_count_raw)

    return ValidationConfig(
        validation_type=validation_type,
        expected_result=expected_result,
        field_conditions=field_conditions,
        field_logic=field_logic,
        validation_scope=validation_scope,
        scope_n=scope_n,
        result_count=result_count,
    )


def _parse_field_condition(raw: Dict[str, Any]) -> FieldCondition:
    field = raw["field"]
    if not isinstance(field, str):
        raise ValueError(
            'Expected "field" to be a string but received %s.'
            % type(field).__name__
        )
    operator = raw["operator"]
    if not isinstance(operator, str):
        raise ValueError(
            'Expected "operator" to be a string but received %s.'
            % type(operator).__name__
        )
    value = raw["value"]
    if not isinstance(value, str):
        raise ValueError(
            'Expected "value" to be a string but received %s.'
            % type(value).__name__
        )
    scenario_scope = raw.get("scenarioScope", "all")
    return FieldCondition(
        field=field,
        operator=operator,
        value=value,
        scenario_scope=scenario_scope,
    )


def _parse_result_count(raw: Dict[str, Any]) -> ResultCount:
    enabled = bool(raw.get("enabled", True))
    operator = _get_str(raw, "operator", "equals")
    value_raw = raw.get("value", 0)
    if isinstance(value_raw, bool):
        value = int(value_raw)
    elif isinstance(value_raw, (int, float)):
        value = int(value_raw)
    else:
        try:
            value = int(str(value_raw))
        except (TypeError, ValueError):
            logger.warning(
                'Expected "validation.resultCount.value" to be numeric; '
                "received %s. Coercing to 0.",
                type(value_raw).__name__,
            )
            value = 0

    return ResultCount(enabled=enabled, operator=operator, value=value)


def _get_str(obj: Dict[str, Any], key: str, default: str) -> str:
    """Get a string value from a dict, with a default fallback."""
    value = obj.get(key, default)
    if value is None:
        return default
    if isinstance(value, str):
        return value
    try:
        return str(value)
    except Exception:
        logger.warning(
            'Could not convert value for key "%s" to string; using default "%s".',
            key,
            default,
        )
        return default
