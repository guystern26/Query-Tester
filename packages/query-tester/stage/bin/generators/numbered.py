# -*- coding: utf-8 -*-
"""Numbered field generator — produces prefix_N values with optional padding."""
from __future__ import annotations

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> str:
    prefix = rule.config.get("prefix", rule.field_name)
    start = rule.config.get("start", 1)
    try:
        start = int(start)
    except (TypeError, ValueError):
        start = 1
    padding = rule.config.get("padding", 0)
    try:
        padding = int(padding)
    except (TypeError, ValueError):
        padding = 0

    number = index + start
    if padding > 0:
        num_str = str(number).zfill(padding)
    else:
        num_str = str(number)

    return "{0}_{1}".format(prefix, num_str)
