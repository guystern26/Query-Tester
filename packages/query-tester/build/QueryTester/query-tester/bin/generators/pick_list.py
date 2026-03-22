# -*- coding: utf-8 -*-
"""Pick-list generator — weighted random selection from a list of values."""
from __future__ import annotations

import random
from typing import Any, List

from core.helpers import normalize_weights
from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> Any:
    variants = rule.config.get("variants") or []
    if not variants:
        return ""

    values = []  # type: List[Any]
    weights_input = []  # type: List[float]
    for variant in variants:
        value = variant.get("value")
        if value is None:
            value = ""
        values.append(str(value))
        weight_raw = variant.get("weight", 1)
        try:
            weight = float(weight_raw)
        except (TypeError, ValueError):
            weight = 1.0
        weights_input.append(weight)

    weights = normalize_weights(weights_input)
    return random.choices(values, weights=weights, k=1)[0]
