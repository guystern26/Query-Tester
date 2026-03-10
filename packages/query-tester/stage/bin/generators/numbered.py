# -*- coding: utf-8 -*-
"""Numbered field generator — produces prefix_N values."""
from __future__ import annotations

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> str:
    prefix = rule.config.get("prefix", rule.field_name)
    return "{0}_{1}".format(prefix, index + 1)
