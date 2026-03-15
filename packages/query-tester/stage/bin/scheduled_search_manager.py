# -*- coding: utf-8 -*-
"""
scheduled_search_manager.py — Create/update/delete backing saved searches
for scheduled tests.

Note: Saved searches are created for UI visibility only. The actual test
execution is handled by scheduled_runner.py (scripted input), because
Splunk Free license does not support alert actions.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

import splunklib.client as splunk_client

from config import SPLUNK_HOST, SPLUNK_PORT
from logger import get_logger

logger = get_logger(__name__)

SAVED_SEARCH_PREFIX = "QT - "


def _connect(session_key, owner="nobody"):
    # type: (str, str) -> Any
    return splunk_client.connect(
        host=SPLUNK_HOST, port=SPLUNK_PORT,
        splunkToken=session_key, app="QueryTester", owner=owner,
    )


def _is_enabled(record):
    # type: (Dict[str, Any]) -> bool
    val = record.get("enabled", True)
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("1", "true", "yes")
    return bool(val)


def saved_search_name(record):
    # type: (Dict[str, Any]) -> str
    test_name = record.get("testName", "Unnamed")
    record_id = record.get("id", "unknown")
    return "{prefix}{name} [{short_id}]".format(
        prefix=SAVED_SEARCH_PREFIX,
        name=test_name,
        short_id=record_id[:8],
    )


def _search_kwargs(record):
    # type: (Dict[str, Any]) -> Dict[str, str]
    """Saved search kwargs — scheduling only, no alert actions."""
    cron = record.get("cronSchedule", "0 6 * * *")
    disabled = "0" if _is_enabled(record) else "1"
    return {
        "cron_schedule": cron,
        "is_scheduled": "1",
        "disabled": disabled,
        "dispatch.earliest_time": "-1m",
        "dispatch.latest_time": "now",
    }


def _find_saved_search(session_key, record):
    # type: (str, Dict[str, Any]) -> Optional[Any]
    """Find saved search across all owners."""
    service = _connect(session_key, owner="-")
    name = saved_search_name(record)
    record_id = record.get("id", "")

    # Try new naming
    try:
        return service.saved_searches[name]
    except KeyError:
        pass

    # Try old naming
    old_name = "QueryTester_Scheduled_" + record_id
    try:
        return service.saved_searches[old_name]
    except KeyError:
        pass

    # Scan by short ID suffix
    short_id = "[{0}]".format(record_id[:8])
    for search in service.saved_searches:
        sname = search.name
        if sname.startswith(SAVED_SEARCH_PREFIX) and sname.endswith(short_id):
            return search
        if sname.startswith("QueryTester_Scheduled_") and record_id in sname:
            return search

    return None


def create_saved_search(session_key, record):
    # type: (str, Dict[str, Any]) -> None
    name = saved_search_name(record)
    spl = '| makeresults | eval test_id="{0}", scheduled_test="{1}"'.format(
        record.get("testId", ""), record["id"],
    )

    # Check if one already exists
    existing = _find_saved_search(session_key, record)
    if existing is not None:
        try:
            existing.update(search=spl, **_search_kwargs(record))
            logger.info("Updated existing saved search: %s", existing.name)
            return
        except Exception as exc:
            logger.warning("Failed to update existing %s: %s", existing.name, exc)
            try:
                existing.delete()
            except Exception:
                pass

    service = _connect(session_key)
    try:
        ss = service.saved_searches.create(name, search=spl, **_search_kwargs(record))
        try:
            ss.acl_update(sharing="app", **{"perms.read": "*", "perms.write": "admin,power"})
        except Exception as acl_exc:
            logger.warning("Failed to set ACL on %s: %s", name, acl_exc)
        logger.info("Created saved search: %s", name)
    except Exception as exc:
        logger.warning("Failed to create saved search %s: %s", name, exc)


def update_saved_search(session_key, record):
    # type: (str, Dict[str, Any]) -> None
    existing = _find_saved_search(session_key, record)

    if existing is not None:
        try:
            existing.update(**_search_kwargs(record))
            logger.info("Updated saved search: %s", existing.name)
        except Exception as exc:
            logger.warning("Failed to update saved search %s: %s", existing.name, exc)
        return

    logger.info("Saved search not found for %s, creating.", record.get("id", ""))
    create_saved_search(session_key, record)


def delete_saved_search(session_key, record_id):
    # type: (str, str) -> None
    dummy = {"id": record_id, "testName": ""}
    existing = _find_saved_search(session_key, dummy)
    if existing is not None:
        try:
            existing.delete()
            logger.info("Deleted saved search: %s", existing.name)
        except Exception as exc:
            logger.warning("Failed to delete saved search %s: %s", existing.name, exc)
        return

    logger.warning("No saved search found to delete for record %s", record_id)
