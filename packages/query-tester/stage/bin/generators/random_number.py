# -*- coding: utf-8 -*-
"""Random number generator — produces random int or float in a range."""
from __future__ import annotations

import random
from typing import Any

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> Any:
    lo = rule.config.get("min", 0)
    hi = rule.config.get("max", 100)
    try:
        lo_num = float(lo)
        hi_num = float(hi)
    except (TypeError, ValueError):
        lo_num = 0.0
        hi_num = 100.0

    if rule.config.get("float", False):
        return round(random.uniform(lo_num, hi_num), 2)
    return int(random.randint(int(lo_num), int(hi_num)))
