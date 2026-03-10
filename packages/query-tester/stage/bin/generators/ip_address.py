# -*- coding: utf-8 -*-
"""IP address generator — produces subnet.N addresses."""
from __future__ import annotations

import random

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> str:
    subnet = rule.config.get("subnet", "10.0.0")
    return "{0}.{1}".format(subnet, random.randint(1, 254))
