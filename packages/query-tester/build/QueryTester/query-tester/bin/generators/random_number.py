# -*- coding: utf-8 -*-
"""Random number generator — produces random int or float in a range."""
from __future__ import annotations

import random
from typing import Any, Dict, List

from core.helpers import normalize_weights
from core.models import GeneratorRule


def _generate_number(variant: Dict[str, Any]) -> str:
    """Generate a single number from a variant config."""
    try:
        lo = float(variant.get("min", 0))
    except (TypeError, ValueError):
        lo = 0.0
    try:
        hi = float(variant.get("max", 100))
    except (TypeError, ValueError):
        hi = 100.0

    if lo > hi:
        lo, hi = hi, lo

    decimals = variant.get("decimals", 0)
    try:
        decimals = int(decimals)
    except (TypeError, ValueError):
        decimals = 0

    prefix = str(variant.get("prefix", "") or "")
    suffix = str(variant.get("suffix", "") or "")

    if decimals > 0:
        num = str(round(random.uniform(lo, hi), decimals))
    else:
        num = str(int(random.randint(int(lo), int(hi))))

    return prefix + num + suffix


def generate(rule: GeneratorRule, index: int) -> Any:
    variants = rule.config.get("variants") or []

    # Legacy format: {min, max, float} — used by old config_parser normalization
    if not variants and "min" in rule.config:
        lo = rule.config.get("min", 0)
        hi = rule.config.get("max", 100)
        try:
            lo_num = float(lo)
            hi_num = float(hi)
        except (TypeError, ValueError):
            lo_num = 0.0
            hi_num = 100.0

        if lo_num > hi_num:
            lo_num, hi_num = hi_num, lo_num

        if rule.config.get("float", False):
            return round(random.uniform(lo_num, hi_num), 2)
        return int(random.randint(int(lo_num), int(hi_num)))

    if not variants:
        return int(random.randint(0, 100))

    if len(variants) == 1:
        return _generate_number(variants[0])

    # Weighted selection among variants
    weights_input = []  # type: List[float]
    for v in variants:
        try:
            weights_input.append(float(v.get("weight", 1)))
        except (TypeError, ValueError):
            weights_input.append(1.0)

    weights = normalize_weights(weights_input)
    chosen = random.choices(variants, weights=weights, k=1)[0]
    return _generate_number(chosen)
