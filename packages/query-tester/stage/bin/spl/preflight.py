# -*- coding: utf-8 -*-
"""
preflight.py — Pre-flight SPL validation against the command policy.
Fetches the cached policy and checks for blocked commands.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from logger import get_logger

logger = get_logger(__name__)


def check_blocked_commands(spl, policy):
    # type: (str, List[Dict[str, Any]]) -> List[str]
    """Return list of blocked command names found in the SPL.

    *policy* is the full command policy list (from get_cached_policy).
    Only commands with allowed == "false" are checked.
    Uses whole-word regex to avoid false positives.
    """
    blocked = [
        entry["command"]
        for entry in policy
        if entry.get("allowed") == "false"
    ]
    if not blocked:
        return []

    spl_lower = spl.lower()
    found = []  # type: List[str]
    for cmd in blocked:
        if re.search(r'\b' + re.escape(cmd) + r'\b', spl_lower):
            found.append(cmd)
    return found
