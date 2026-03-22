# -*- coding: utf-8 -*-
"""General field generator — produces {prefix}{random_component}{suffix} values."""
from __future__ import annotations

import random
import string
from typing import Any, List

from core.helpers import normalize_weights
from core.models import GeneratorRule


def _random_component(comp_type: str, length: int) -> str:
    """Generate a random string component based on type and length."""
    if length < 1:
        length = 6
    if comp_type == "numeric":
        return "".join(random.choices(string.digits, k=length))
    if comp_type == "alpha":
        return "".join(random.choices(string.ascii_letters, k=length))
    if comp_type == "hex":
        return "".join(random.choices(string.hexdigits[:16], k=length))
    # default: alphanumeric
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def generate(rule: GeneratorRule, index: int) -> Any:
    variants = rule.config.get("variants") or []
    if not variants:
        return ""

    values = []  # type: List[str]
    weights_input = []  # type: List[float]
    for variant in variants:
        if not isinstance(variant, dict):
            continue
        prefix = str(variant.get("prefix", "") or "")
        suffix = str(variant.get("suffix", "") or "")
        comp_type = str(variant.get("componentType", "alphanumeric") or "alphanumeric")
        comp_length = variant.get("componentLength", 6)
        try:
            comp_length = int(comp_length)
        except (TypeError, ValueError):
            comp_length = 6

        value = prefix + _random_component(comp_type, comp_length) + suffix
        values.append(value)

        weight_raw = variant.get("weight", 1)
        try:
            weight = float(weight_raw)
        except (TypeError, ValueError):
            weight = 1.0
        weights_input.append(weight)

    if not values:
        return ""

    weights = normalize_weights(weights_input)
    return random.choices(values, weights=weights, k=1)[0]
