# -*- coding: utf-8 -*-
"""
config_parser.py
Parse generator configuration from raw payload dicts.
"""
from __future__ import annotations

from typing import Any, Dict, List

from logger import get_logger
from core.models import GeneratorConfig, GeneratorRule


logger = get_logger(__name__)


def parse_generator_config(raw: Dict[str, Any]) -> GeneratorConfig:
    """Parse a generatorConfig block into a GeneratorConfig dataclass."""
    enabled = bool(raw.get("enabled", False))
    event_count_raw = raw.get("eventCount", 0)
    if isinstance(event_count_raw, bool):
        event_count = int(event_count_raw)
    elif isinstance(event_count_raw, (int, float)):
        event_count = int(event_count_raw)
    else:
        try:
            event_count = int(str(event_count_raw))
        except (TypeError, ValueError):
            logger.warning(
                'Expected "generatorConfig.eventCount" to be numeric; '
                "received %s. Coercing to 0.",
                type(event_count_raw).__name__,
            )
            event_count = 0

    rules_raw = raw.get("rules") or []
    if not isinstance(rules_raw, list):
        logger.warning(
            'Expected "generatorConfig.rules" to be a list; '
            "received %s. Treating as empty.",
            type(rules_raw).__name__,
        )
        rules_raw = []

    rules = []  # type: List[GeneratorRule]
    for rule_obj in rules_raw:
        if not isinstance(rule_obj, dict):
            logger.warning(
                "Skipping non-object generator rule of type %s.",
                type(rule_obj).__name__,
            )
            continue
        rules.append(_parse_generator_rule(rule_obj))

    return GeneratorConfig(enabled=enabled, event_count=event_count, rules=rules)


def _parse_generator_rule(raw: Dict[str, Any]) -> GeneratorRule:
    rule_id = _get_str(raw, "id", "")
    field_name = raw["fieldName"]
    if not isinstance(field_name, str):
        raise ValueError(
            'Expected "fieldName" to be a string but received %s.'
            % type(field_name).__name__
        )
    generation_type = raw["generationType"]
    if not isinstance(generation_type, str):
        raise ValueError(
            'Expected "generationType" to be a string but received %s.'
            % type(generation_type).__name__
        )
    config_raw = raw.get("config") or {}
    if not isinstance(config_raw, dict):
        logger.warning(
            'Expected "generatorConfig.rules[].config" to be an object; '
            "received %s. Using empty object.",
            type(config_raw).__name__,
        )
        config_raw = {}

    config_normalized = _normalize_config(generation_type, config_raw)

    return GeneratorRule(
        id=rule_id,
        field_name=field_name,
        generation_type=generation_type,
        config=config_normalized,
    )


def _normalize_config(gen_type: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map frontend camelCase config keys to what each backend generator expects.
    """
    # pick_list: frontend sends {items: [{value, weight}]}
    # backend expects {variants: [{value, weight}]}
    if gen_type == "pick_list":
        items = raw.get("items") or raw.get("variants") or []
        return {"variants": items}

    # general_field delegates to pick_list, same normalization needed
    if gen_type == "general_field":
        variants = raw.get("variants") or raw.get("items") or []
        # Each variant has componentType/componentLength — convert to value
        normalized = []  # type: list
        for v in variants:
            if isinstance(v, dict) and "value" not in v:
                # Build a value placeholder from the variant spec
                normalized.append(v)
            else:
                normalized.append(v)
        return {"variants": normalized}

    # numbered: frontend sends {pattern, rangeStart, rangeEnd, padLength}
    # backend expects {prefix}
    if gen_type == "numbered":
        prefix = raw.get("pattern") or raw.get("prefix", "")
        return {"prefix": prefix}

    # random_number: frontend sends {variants: [{min, max, decimals, ...}]}
    # backend expects {min, max, float}
    if gen_type == "random_number":
        variants = raw.get("variants") or []
        if variants and isinstance(variants[0], dict):
            v = variants[0]
            return {
                "min": v.get("min", 0),
                "max": v.get("max", 100),
                "float": (v.get("decimals", 0) or 0) > 0,
            }
        return raw

    # email: frontend sends {variants: [{localPart, domain, ...}]}
    # backend expects {domain}
    if gen_type == "email":
        variants = raw.get("variants") or []
        if variants and isinstance(variants[0], dict):
            return {"domain": variants[0].get("domain", "example.com")}
        return raw

    # ip_address: frontend sends {variants: [{ipType, ...}]}
    # backend expects {subnet}
    if gen_type == "ip_address":
        variants = raw.get("variants") or []
        if variants and isinstance(variants[0], dict):
            ip_type = variants[0].get("ipType", "private_c")
            subnet_map = {
                "private_a": "10.0.0",
                "private_b": "172.16.0",
                "private_c": "192.168.1",
                "ipv4": "10.0.0",
            }
            return {"subnet": subnet_map.get(ip_type, "10.0.0")}
        return raw

    return raw


def _get_str(obj: Dict[str, Any], key: str, default: str) -> str:
    value = obj.get(key, default)
    if value is None:
        return default
    if isinstance(value, str):
        return value
    try:
        return str(value)
    except Exception:
        return default
