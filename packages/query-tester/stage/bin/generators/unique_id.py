# -*- coding: utf-8 -*-
"""Unique ID generator — produces UUID hex strings."""
from __future__ import annotations

from uuid import uuid4

from core.models import GeneratorRule


def generate(rule: GeneratorRule, index: int) -> str:
    return uuid4().hex
