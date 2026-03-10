# -*- coding: utf-8 -*-
"""
spl_analyzer.py
Analyze SPL text for risky or unusual commands without modifying it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from logger import get_logger


logger = get_logger(__name__)

UNAUTHORIZED_COMMANDS = {
    "delete",
    "drop",
    "collect",
    "outputlookup",
    "outputcsv",
    "sendemail",
    "dbxquery",
    "rest",
    "script",
    "map",
    "localop",
    "dbinspect",
    "audit",
    "tscollect",
    "meventcollect",
}

UNUSUAL_COMMANDS = {
    "uniq",
    "transaction",
    "multisearch",
    "appendpipe",
    "join",
    "selfjoin",
    "gentimes",
    "loadjob",
    "savedsearch",
}


@dataclass
class SplAnalysis:
    """Summary of SPL commands and associated warnings."""

    unauthorized_commands: List[str] = field(default_factory=list)
    unusual_commands: List[str] = field(default_factory=list)
    uniq_limitations: Optional[str] = None
    commands_used: List[str] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)


def analyze(spl: str) -> SplAnalysis:
    """
    Inspect SPL text and return an SplAnalysis describing detected commands and warnings.
    """
    spl_clean = spl or ""

    # Extract commands from outer query (for general command listing)
    commands = _extract_commands(spl_clean)
    # Also extract commands from the FULL SPL (including subsearches) for safety checks
    all_commands = _extract_all_commands(spl_clean)
    unauthorized = [cmd for cmd in all_commands if cmd in UNAUTHORIZED_COMMANDS]
    unusual = [cmd for cmd in commands if cmd in UNUSUAL_COMMANDS]

    warnings = []  # type: List[Dict[str, Any]]
    uniq_message = None  # type: Optional[str]

    if "join" in commands:
        warnings.append(
            {
                "message": (
                    "join returns only 50,000 results. Consider using append "
                    "+ stats values(*) by * instead."
                ),
                "severity": "warning",
            }
        )

    if "append" in commands:
        warnings.append(
            {
                "message": "append is limited to 1 million results.",
                "severity": "warning",
            }
        )

    if "transaction" in commands:
        warnings.append(
            {
                "message": (
                    "transaction is resource-intensive. Consider using stats "
                    "with by/grouping fields when possible."
                ),
                "severity": "caution",
            }
        )

    if "uniq" in commands:
        uniq_message = (
            "uniq removes only consecutive duplicate events. Sort by the target field "
            "first, or use dedup for full deduplication."
        )
        warnings.append({"message": uniq_message, "severity": "info"})

    if _has_subsearch(spl_clean):
        warnings.append(
            {
                "message": (
                    "Subsearches are limited to 50,000 results and a 60-second timeout."
                ),
                "severity": "warning",
            }
        )

    if _has_tstats(spl_clean):
        warnings.append(
            {
                "message": (
                    "tstats queries cannot be injected with test data. "
                    'Use testType="query_only" to run this query without injection.'
                ),
                "severity": "warning",
            }
        )

    return SplAnalysis(
        unauthorized_commands=unauthorized,
        unusual_commands=unusual,
        uniq_limitations=uniq_message,
        commands_used=commands,
        warnings=warnings,
    )


def _strip_quoted_strings(spl: str) -> str:
    """Remove content inside single and double quotes to prevent false matches."""
    result = []  # type: List[str]
    i = 0
    while i < len(spl):
        ch = spl[i]
        if ch in ('"', "'"):
            quote_char = ch
            i += 1
            while i < len(spl):
                if spl[i] == "\\" and i + 1 < len(spl):
                    i += 2
                    continue
                if spl[i] == quote_char:
                    break
                i += 1
            i += 1
            continue
        result.append(ch)
        i += 1
    return "".join(result)


def _strip_subsearch_bodies(spl: str) -> str:
    parts = []  # type: List[str]
    depth = 0
    for char in spl:
        if char == "[":
            depth += 1
            continue
        if char == "]" and depth > 0:
            depth -= 1
            continue
        if depth == 0:
            parts.append(char)
    return "".join(parts)


def _extract_commands(spl: str) -> List[str]:
    base = _strip_subsearch_bodies(_strip_quoted_strings(spl))
    commands = []  # type: List[str]

    first_pipe = base.find("|")
    if first_pipe == -1:
        first_token = base.strip().split(" ", 1)[0]
        if re.match(r"^[a-zA-Z_]+$", first_token):
            commands.append(first_token.lower())
    else:
        pre = base[:first_pipe].strip().split(" ", 1)[0]
        if re.match(r"^[a-zA-Z_]+$", pre):
            commands.append(pre.lower())

    for match in re.finditer(r"\|\s*([a-zA-Z_]+)", base):
        cmd = match.group(1).lower()
        if cmd not in commands:
            commands.append(cmd)

    return commands


def _extract_all_commands(spl: str) -> List[str]:
    """Extract ALL commands from the full SPL including subsearches (for safety checks)."""
    commands = []  # type: List[str]

    # Strip quoted strings first to avoid false positives on commands inside strings
    safe = _strip_quoted_strings(spl)
    # Strip brackets but keep the content
    flat = safe.replace("[", " ").replace("]", " ")

    first_pipe = flat.find("|")
    if first_pipe == -1:
        first_token = flat.strip().split(" ", 1)[0]
        if re.match(r"^[a-zA-Z_]+$", first_token):
            commands.append(first_token.lower())
    else:
        pre = flat[:first_pipe].strip().split(" ", 1)[0]
        if re.match(r"^[a-zA-Z_]+$", pre):
            commands.append(pre.lower())

    for match in re.finditer(r"\|\s*([a-zA-Z_]+)", flat):
        cmd = match.group(1).lower()
        if cmd not in commands:
            commands.append(cmd)

    return commands


def _has_subsearch(spl: str) -> bool:
    return "[" in spl and "]" in spl


def _has_tstats(spl: str) -> bool:
    return bool(re.search(r"\|\s*tstats\b", spl, re.IGNORECASE))
