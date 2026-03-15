# -*- coding: utf-8 -*-
"""
spl_drift.py — SPL drift detection for scheduled tests.
Compares the current saved search SPL against a stored hash.
"""
from __future__ import annotations

import hashlib
from typing import Any, Optional, Tuple

import splunklib.client as splunk_client

from config import SPLUNK_HOST, SPLUNK_PORT
from logger import get_logger

logger = get_logger(__name__)


def compute_spl_hash(spl):
    # type: (str) -> str
    """Compute a short MD5 hash of SPL, stripping whitespace for consistency."""
    normalized = spl.strip().encode("utf-8")
    return hashlib.md5(normalized).hexdigest()[:12]


def fetch_current_spl(session_key, saved_search_name):
    # type: (str, str) -> Optional[str]
    """Fetch the current SPL from a Splunk saved search."""
    service = splunk_client.connect(
        host=SPLUNK_HOST, port=SPLUNK_PORT,
        splunkToken=session_key, app="QueryTester", owner="admin",
    )
    try:
        search = service.saved_searches[saved_search_name]
        return search["search"]
    except Exception as exc:
        logger.warning("Could not fetch saved search %s: %s", saved_search_name, exc)
        return None


def check_spl_drift(session_key, saved_search_origin, stored_hash):
    # type: (str, str, str) -> Tuple[bool, Optional[str], str]
    """Compare current SPL hash against stored hash.

    Returns (spl_drift_detected, current_spl, current_hash).
    """
    current_spl = fetch_current_spl(session_key, saved_search_origin)
    if current_spl is None:
        return False, None, stored_hash
    current_hash = compute_spl_hash(current_spl)
    drift = stored_hash != "" and current_hash != stored_hash
    if drift:
        logger.info("SPL drift detected for %s: stored=%s current=%s",
                     saved_search_origin, stored_hash, current_hash)
    return drift, current_spl, current_hash
