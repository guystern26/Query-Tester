# -*- coding: utf-8 -*-
"""
sub_query_runner.py
Execute a sub-query SPL and return its results as events for test data injection.
Used by the 'query_data' input mode.
"""
from __future__ import annotations

from typing import Any, Dict, List

from logger import get_logger
from spl.query_executor import QueryExecutor

logger = get_logger(__name__)

MAX_QUERY_DATA_EVENTS = 10000


def run_sub_query(
    spl,          # type: str
    session_key,  # type: str
    app,          # type: str
    earliest_time,  # type: str
    latest_time,    # type: str
):
    # type: (...) -> List[Dict[str, Any]]
    """
    Execute the sub-query SPL and return up to MAX_QUERY_DATA_EVENTS result rows.

    Each row is a plain dict suitable for indexing via HEC.
    Internal Splunk fields (keys starting with '_') are stripped.
    """
    if not spl or not spl.strip():
        raise ValueError("query_data input has an empty sub-query SPL.")

    executor = QueryExecutor(session_key)
    results = executor.run(
        spl,
        app=app,
        earliest_time=earliest_time,
        latest_time=latest_time,
    )

    logger.info(
        "Sub-query returned %d rows (cap=%d).",
        len(results),
        MAX_QUERY_DATA_EVENTS,
    )

    if len(results) > MAX_QUERY_DATA_EVENTS:
        logger.warning(
            "Sub-query returned %d rows, truncating to %d.",
            len(results),
            MAX_QUERY_DATA_EVENTS,
        )
        results = results[:MAX_QUERY_DATA_EVENTS]

    # Strip Splunk internal fields — keep only user-visible data
    cleaned = []  # type: List[Dict[str, Any]]
    for row in results:
        clean = {k: v for k, v in row.items() if not k.startswith("_")}
        if clean:
            cleaned.append(clean)

    return cleaned
