# -*- coding: utf-8 -*-
"""
validation_parser.py
Parse the validation section of the frontend payload into typed dataclasses.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from logger import get_logger
from core.models import FieldCondition, FieldConditionGroup, ResultCount, ValidationConfig


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
                try:
                    field_conditions.append(_parse_field_condition(condition_obj))
                except (KeyError, ValueError) as exc:
                    logger.warning(
                        "Skipping malformed field condition: %s", str(exc)
                    )

    # Parse fieldGroups (structured, with per-group conditionLogic)
    field_groups_raw = raw.get("fieldGroups")
    field_groups = None  # type: Optional[List[FieldConditionGroup]]
    if field_groups_raw is not None:
        if not isinstance(field_groups_raw, list):
            logger.warning(
                'Expected "validation.fieldGroups" to be a list or null; '
                "received %s. Ignoring.",
                type(field_groups_raw).__name__,
            )
        else:
            field_groups = []
            for group_obj in field_groups_raw:
                if not isinstance(group_obj, dict):
                    logger.warning(
                        "Skipping non-object field group of type %s.",
                        type(group_obj).__name__,
                    )
                    continue
                try:
                    field_groups.append(_parse_field_group(group_obj))
                except (KeyError, ValueError) as exc:
                    logger.warning(
                        "Skipping malformed field group: %s", str(exc)
                    )

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
        field_groups=field_groups,
        field_logic=field_logic,
        validation_scope=validation_scope,
        scope_n=scope_n,
        result_count=result_count,
    )


def _parse_field_condition(raw: Dict[str, Any]) -> FieldCondition:
    for key in ("field", "operator", "value"):
        if key not in raw:
            raise ValueError(
                'Missing required key "{0}" in fieldCondition: {1}'.format(key, raw)
            )

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
        try:
            value = str(value)
        except Exception:
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


def _parse_field_group(raw: Dict[str, Any]) -> FieldConditionGroup:
    field_name = raw.get("field")
    if not field_name or not isinstance(field_name, str):
        raise ValueError(
            'Missing or non-string "field" in fieldGroup: {0}'.format(raw)
        )
    condition_logic = _get_str(raw, "conditionLogic", "and")
    scenario_scope = raw.get("scenarioScope", "all")

    conditions_raw = raw.get("conditions") or []
    if not isinstance(conditions_raw, list):
        raise ValueError(
            'Expected "conditions" to be a list in fieldGroup: {0}'.format(raw)
        )

    conditions = []  # type: List[FieldCondition]
    for cond_obj in conditions_raw:
        if not isinstance(cond_obj, dict):
            continue
        operator = cond_obj.get("operator")
        if not operator or not isinstance(operator, str):
            continue
        value = cond_obj.get("value", "")
        if not isinstance(value, str):
            try:
                value = str(value)
            except Exception:
                value = ""
        conditions.append(FieldCondition(
            field=field_name,
            operator=operator,
            value=value,
            scenario_scope=scenario_scope,
        ))

    return FieldConditionGroup(
        field=field_name,
        conditions=conditions,
        condition_logic=condition_logic,
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
