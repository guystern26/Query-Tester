# -*- coding: utf-8 -*-
"""
query_injector.py
Rewrite SPL strings to target the temp query tester index.
"""
from __future__ import annotations

import re
from typing import Any, Callable, Dict, List

from logger import get_logger
from config import TEMP_INDEX
from core.models import ParsedInput


logger = get_logger(__name__)

INDEX_PATTERN = re.compile(r'(?i)\bindex\s*=\s*["\']?[\w\*\-\.]+["\']?')
LOOKUP_PATTERN = re.compile(r"(?i)(\|\s*lookup\s+)([\w\-\.]+)")


def _outer_segment(spl: str) -> str:
    bracket_pos = spl.find("[")
    if bracket_pos == -1:
        return spl
    return spl[:bracket_pos]


def detect_strategy(spl: str) -> str:
    """
    Detect the injection strategy for the given SPL.

    Order is significant: inputlookup, tstats, lookup, standard, no_index.
    """
    spl_clean = (spl or "").strip()
    if re.search(r"\|\s*inputlookup\b", spl_clean, re.IGNORECASE):
        return "inputlookup"
    if re.search(r"\|\s*tstats\b", spl_clean, re.IGNORECASE):
        return "tstats"
    if re.search(r"\|\s*lookup\s+\w", spl_clean, re.IGNORECASE):
        return "lookup"
    if re.search(r"\bindex\s*=", _outer_segment(spl_clean), re.IGNORECASE):
        return "standard"
    return "no_index"


def inject(
    spl: str,
    run_id: str,
    strategy: str,
    inputs: List[ParsedInput],
) -> str:
    """
    Apply the selected injection strategy to the SPL.
    """
    handler = STRATEGY_HANDLERS.get(strategy)
    if handler is None:
        logger.warning('Unknown injection strategy "%s" — returning SPL unchanged.', strategy)
        return spl
    return handler(spl, run_id, inputs)


def _inject_noop(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    return spl


def _run_id_field(run_id: str) -> str:
    """Return the unique run_id field name for this run, e.g. run_id_6d1f4ac7."""
    return "run_id_{0}".format(run_id)


def _inject_standard(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    replacement = "index={0} {1}={2}".format(TEMP_INDEX, _run_id_field(run_id), run_id)
    current = spl

    for parsed_input in inputs:
        row_identifier = parsed_input.row_identifier.strip()
        if not row_identifier:
            continue
        replaced = _replace_by_row_identifier(current, row_identifier, replacement)
        if replaced is not None:
            current = replaced
            break

    if current != spl:
        return current

    return _replace_outer_index(current, replacement)


def _inject_no_index(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    prefix = "index={0} {1}={2} ".format(TEMP_INDEX, _run_id_field(run_id), run_id)
    stripped = spl.lstrip()
    leading = spl[: len(spl) - len(stripped)]
    return leading + prefix + stripped


def _inject_lookup(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    injected = _inject_standard(spl, run_id, inputs)
    temp_file = "temp_lookup_{0}.csv".format(run_id)
    return LOOKUP_PATTERN.sub(lambda match: match.group(1) + temp_file, injected, count=1)


def _replace_by_row_identifier(
    spl: str, row_identifier: str, replacement: str
) -> str:
    escaped = re.escape(row_identifier)
    pattern = re.compile(escaped, re.IGNORECASE)

    # Only replace in the outer segment (before first '[') to protect subsearches
    bracket_pos = spl.find("[")
    if bracket_pos == -1:
        result, count = pattern.subn(replacement, spl, count=1)
        if count == 0:
            return None  # type: ignore[return-value]
        return result

    outer = spl[:bracket_pos]
    inner = spl[bracket_pos:]
    result, count = pattern.subn(replacement, outer, count=1)
    if count == 0:
        return None  # type: ignore[return-value]
    return result + inner


def _replace_outer_index(spl: str, replacement: str) -> str:
    bracket_pos = spl.find("[")
    if bracket_pos == -1:
        return INDEX_PATTERN.sub(replacement, spl, count=1)

    outer = spl[:bracket_pos]
    inner = spl[bracket_pos:]
    return INDEX_PATTERN.sub(replacement, outer, count=1) + inner


STRATEGY_HANDLERS: Dict[str, Callable[[str, str, List[ParsedInput]], str]] = {
    "standard": _inject_standard,
    "lookup": _inject_lookup,
    "inputlookup": _inject_noop,
    "tstats": _inject_noop,
    "no_index": _inject_no_index,
}
