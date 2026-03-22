# -*- coding: utf-8 -*-
"""
event_generator.py
Expand ParsedInput definitions into flat event lists for indexing.
"""
from __future__ import annotations

from typing import Any, Dict, List

from logger import get_logger
from core.models import GeneratorConfig, ParsedInput
from generators import GENERATOR_REGISTRY


logger = get_logger(__name__)


def build_events(inp: ParsedInput) -> List[Dict[str, Any]]:
    """
    Expand a ParsedInput into a list of event dicts to be indexed.
    """
    generator_config = inp.generator_config
    if not generator_config or not generator_config.enabled:
        return _filter_non_empty(inp.events)

    return _generate(inp.events, generator_config)


def _filter_non_empty(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = []  # type: List[Dict[str, Any]]
    for event in events:
        if not isinstance(event, dict):
            logger.warning(
                "Skipping non-dict event of type %s in build_events.",
                type(event).__name__,
            )
            continue
        # Keep any event that has at least one field key, even if all values are empty.
        # An event like {"field": ""} is intentional — the user wants an event with an empty value.
        if event:
            result.append(event)
    return result


def _generate(base_events: List[Dict[str, Any]], config: GeneratorConfig) -> List[Dict[str, Any]]:
    template = dict(base_events[0]) if base_events else {}  # type: Dict[str, Any]

    result = []  # type: List[Dict[str, Any]]
    for index in range(config.event_count):
        event = dict(template)
        for rule in config.rules:
            event[rule.field_name] = _apply_rule(rule, index)
        result.append(event)
    return result


def _apply_rule(rule: Any, index: int) -> Any:
    fn = GENERATOR_REGISTRY.get(rule.generation_type)
    if fn is None:
        logger.warning(
            'Unknown generation_type "%s" -- returning empty string',
            rule.generation_type,
        )
        return ""
    return fn(rule, index)
