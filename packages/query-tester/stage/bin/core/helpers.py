# -*- coding: utf-8 -*-
"""
helpers.py
Shared utility functions for the Splunk Query Tester backend.
"""
from __future__ import annotations

from typing import List


def safe_float(value: str) -> float:
    """Convert a string to float, returning 0.0 on failure."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def normalize_weights(weights: List[float]) -> List[float]:
    """Normalize a list of weights to sum to 1.0."""
    total = sum(weights)
    if total <= 0 or not weights:
        size = len(weights) if weights else 1
        return [1.0 / float(size)] * size
    return [w / total for w in weights]
