# -*- coding: utf-8 -*-
"""Email generator — produces userN@domain addresses."""
from __future__ import annotations

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> str:
    domain = rule.config.get("domain", "example.com")
    return "user{0}@{1}".format(index + 1, domain)
