# -*- coding: utf-8 -*-
"""
query_injector.py
Rewrite SPL strings to target the temp query tester index.
"""
from __future__ import annotations

import re
from typing import Callable, Dict, List, Optional

from logger import get_logger
from config import TEMP_INDEX
from core.models import ParsedInput
logger = get_logger(__name__)

INDEX_PATTERN = re.compile(r'(?i)\bindex\s*=\s*["\']?[\w\*\-\.]+["\']?')
LOOKUP_PATTERN = re.compile(r"(?i)(\|\s*lookup\s+)([\w\-\.]+)")
INPUTLOOKUP_PATTERN = re.compile(
    r"(?i)(?:\|\s*)?inputlookup\s+[\w\-\.]+(?:\.csv)?"
)

_RE_INPUTLOOKUP = re.compile(r"(?:^|\|)\s*inputlookup\b", re.IGNORECASE)
_RE_TSTATS = re.compile(r"(?:^|\|)\s*tstats\b", re.IGNORECASE)
_RE_LOOKUP = re.compile(r"(?:^|\|)\s*lookup\s+\w", re.IGNORECASE)
_RE_INDEX = re.compile(r"\bindex\s*=", re.IGNORECASE)


def _outer_segment(spl: str) -> str:
    bracket_pos = spl.find("[")
    if bracket_pos == -1:
        return spl
    return spl[:bracket_pos]


def _run_id_field(run_id: str) -> str:
    return "run_id_{0}".format(run_id)


def _build_replacement(run_id: str) -> str:
    return "index={0} {1}={2}".format(TEMP_INDEX, _run_id_field(run_id), run_id)


def _apply_row_identifiers(
    spl: str, inputs: List[ParsedInput], replacement: str,
) -> Optional[str]:
    """Apply all input row identifiers, replacing every match globally.
    Returns the modified SPL if any RI matched, or None if none matched.
    """
    current = spl
    for parsed_input in inputs:
        row_identifier = parsed_input.row_identifier.strip()
        if not row_identifier:
            continue
        replaced = _replace_by_row_identifier(current, row_identifier, replacement)
        if replaced is not None:
            current = replaced
    if current != spl:
        return current
    return None


def detect_strategy(spl: str) -> str:
    """Detect the injection strategy for the given SPL.

    Only inspects the outer segment (before first '[') so that inputlookup
    inside a subsearch does not override the primary strategy.
    Order: inputlookup, tstats, lookup, standard, no_index.
    """
    spl_clean = (spl or "").strip()
    outer = _outer_segment(spl_clean)
    if _RE_INPUTLOOKUP.search(outer):
        return "inputlookup"
    if _RE_TSTATS.search(spl_clean):
        return "tstats"
    if _RE_LOOKUP.search(spl_clean):
        return "lookup"
    if _RE_INDEX.search(outer):
        return "standard"
    return "no_index"


def inject(
    spl: str, run_id: str, strategy: str, inputs: List[ParsedInput],
) -> str:
    """Apply the selected injection strategy, then replace any remaining
    inputlookup commands (e.g. inside subsearches) as a post-step.
    """
    handler = STRATEGY_HANDLERS.get(strategy)
    if handler is None:
        logger.warning('Unknown injection strategy "%s" — returning SPL unchanged.', strategy)
        return spl
    result = handler(spl, run_id, inputs)
    if strategy != "tstats":
        result = _replace_all_inputlookups(result, run_id)
    return result


def _inject_noop(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    return spl


def _inject_standard(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    replacement = _build_replacement(run_id)
    result = _apply_row_identifiers(spl, inputs, replacement)
    if result is not None:
        return result
    return _replace_outer_index(spl, replacement)


def _inject_no_index(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    prefix = _build_replacement(run_id) + " "
    stripped = spl.lstrip()
    leading = spl[: len(spl) - len(stripped)]
    return leading + prefix + stripped


def _inject_inputlookup(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    """Replace '| inputlookup <name>' with temp index reference.
    Must not produce '| index=...' which is invalid SPL.
    """
    replacement = _build_replacement(run_id)
    result = _apply_row_identifiers(spl, inputs, replacement)
    if result is not None:
        return result
    outer = _outer_segment(spl)
    match = INPUTLOOKUP_PATTERN.search(outer)
    if not match:
        logger.warning("inputlookup strategy but pattern not found — returning SPL unchanged.")
        return spl
    return spl[:match.start()] + replacement + spl[match.end():]


def _inject_lookup(spl: str, run_id: str, inputs: List[ParsedInput]) -> str:
    injected = _inject_standard(spl, run_id, inputs)
    temp_file = "temp_lookup_{0}.csv".format(run_id)
    return LOOKUP_PATTERN.sub(lambda m: m.group(1) + temp_file, injected, count=1)


def _replace_by_row_identifier(
    spl: str, row_identifier: str, replacement: str,
) -> Optional[str]:
    """Replace ALL occurrences of the row identifier in the full SPL."""
    escaped = re.escape(row_identifier)
    pattern = re.compile(escaped, re.IGNORECASE)
    result, count = pattern.subn(replacement, spl)
    if count == 0:
        return None
    return result


def _replace_outer_index(spl: str, replacement: str) -> str:
    """Find the outer index clause, then replace ALL occurrences of that
    exact index=<value> throughout the SPL. Other index values stay.
    """
    outer = _outer_segment(spl)
    match = INDEX_PATTERN.search(outer)
    if not match:
        return spl
    original_clause = match.group(0)
    exact_pattern = re.compile(re.escape(original_clause), re.IGNORECASE)
    return exact_pattern.sub(replacement, spl)


def _replace_all_inputlookups(spl: str, run_id: str) -> str:
    """Replace every inputlookup command in the SPL with the temp index."""
    return INPUTLOOKUP_PATTERN.sub(_build_replacement(run_id), spl)


_ORPHAN_PATTERNS = [
    (re.compile(r"(?i)\bsourcetype\s*=\s*\S+"), "sourcetype="),
    (re.compile(r"(?i)\bsource\s*=\s*\S+"), "source="),
    (re.compile(r"(?i)\bhost\s*=\s*\S+"), "host="),
]


def check_orphaned_filters(original_spl: str, injected_spl: str) -> Optional[str]:
    """Check if filter clauses remain after injection that won't match temp data."""
    outer = _outer_segment(injected_spl)
    orphans = []  # type: List[str]
    for pattern, label in _ORPHAN_PATTERNS:
        if pattern.search(outer):
            orphans.append(label)
    if not orphans:
        return None
    return (
        "After injection the query still contains {0} in the outer segment. "
        "These filters don't apply to generated data and may cause zero results. "
        "Include them in the row identifier to avoid this.".format(
            ", ".join(orphans)
        )
    )


STRATEGY_HANDLERS: Dict[str, Callable[[str, str, List[ParsedInput]], str]] = {
    "standard": _inject_standard,
    "lookup": _inject_lookup,
    "inputlookup": _inject_inputlookup,
    "tstats": _inject_noop,
    "no_index": _inject_no_index,
}
