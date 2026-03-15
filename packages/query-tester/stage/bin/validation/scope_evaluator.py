# -*- coding: utf-8 -*-
"""
scope_evaluator.py
Evaluate pass/fail based on per-row results and the validation scope.
"""
from __future__ import annotations

from typing import List, Optional

from logger import get_logger


logger = get_logger(__name__)


SCOPE_LABELS = {
    "all_events": "all events",
    "any_event": "at least one event",
    "exactly_n": "exactly {n} event(s)",
    "at_least_n": "at least {n} event(s)",
    "at_most_n": "at most {n} event(s)",
}


def evaluate_scope(
    per_row,           # type: List[bool]
    validation_scope,  # type: str
    scope_n,           # type: Optional[int]
):
    # type: (...) -> bool
    """Decide pass/fail based on per-row results and the validation scope."""
    if not per_row:
        return False

    match_count = sum(per_row)

    if validation_scope == "all_events":
        return all(per_row)

    if validation_scope == "any_event":
        return any(per_row)

    if scope_n is None:
        logger.warning(
            "Scope %r requires scopeN but it was not provided; defaulting to 0.",
            validation_scope,
        )
    n = scope_n if scope_n is not None else 0

    if validation_scope == "exactly_n":
        return match_count == n

    if validation_scope == "at_least_n":
        return match_count >= n

    if validation_scope == "at_most_n":
        return match_count <= n

    # Default: any_event
    return any(per_row)
