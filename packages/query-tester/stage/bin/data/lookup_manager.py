# -*- coding: utf-8 -*-
"""
lookup_manager.py
Create and delete temporary CSV lookups for lookup-based queries.
"""
from __future__ import annotations

import csv
import os
from typing import Any, Dict, List

from logger import get_logger


logger = get_logger(__name__)

SPLUNK_HOME = os.environ.get("SPLUNK_HOME", "/opt/splunk")


def _deduplicate(
    events,   # type: List[Dict[str, Any]]
    fieldnames,  # type: List[str]
):
    # type: (...) -> List[Dict[str, Any]]
    """Remove duplicate rows from the event list, preserving order."""
    seen = set()  # type: set
    unique = []  # type: List[Dict[str, Any]]
    for event in events:
        key = tuple(event.get(f, "") for f in fieldnames)
        if key not in seen:
            seen.add(key)
            unique.append(event)
    return unique


def _lookup_dir(app: str) -> str:
    """Build the lookups directory path for the given Splunk app."""
    return os.path.join(SPLUNK_HOME, "etc", "apps", app, "lookups")


def create_temp_lookup(
    run_id: str, events: List[Dict[str, Any]], app: str
) -> str:
    """
    Write events to a temp CSV file in the target app's lookups directory.
    Returns the filename (not full path).
    """
    if not events:
        raise ValueError(
            "Cannot create lookup for run_id={0}: events list is empty".format(
                run_id
            )
        )

    lookup_dir = _lookup_dir(app)
    filename = "temp_lookup_{0}.csv".format(run_id)
    filepath = os.path.join(lookup_dir, filename)
    os.makedirs(lookup_dir, exist_ok=True)

    fieldnames = list(events[0].keys())
    unique_events = _deduplicate(events, fieldnames)
    with open(filepath, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file, fieldnames=fieldnames, extrasaction="ignore"
        )
        writer.writeheader()
        writer.writerows(unique_events)

    if len(unique_events) < len(events):
        logger.info(
            "Deduplicated lookup %s: %d -> %d rows",
            filename, len(events), len(unique_events),
        )

    logger.info(
        "Created lookup %s with %d rows in app=%s", filename, len(unique_events), app
    )
    return filename


def delete_temp_lookup(run_id: str, app: str) -> None:
    """
    Delete the temp CSV. Silently ignores if file does not exist.
    """
    lookup_dir = _lookup_dir(app)
    filename = "temp_lookup_{0}.csv".format(run_id)
    filepath = os.path.join(lookup_dir, filename)
    try:
        os.remove(filepath)
        logger.info("Deleted lookup for run_id=%s in app=%s", run_id, app)
    except FileNotFoundError:
        return
    except Exception as exc:
        logger.warning(
            "Could not delete lookup for run_id=%s in app=%s: %s",
            run_id,
            app,
            exc,
        )
