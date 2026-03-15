# -*- coding: utf-8 -*-
"""
scheduled_search_manager.py — Create/update/delete backing saved searches
for scheduled tests.
"""
from __future__ import annotations

from typing import Any, Dict

import splunklib.client as splunk_client

from config import SPLUNK_HOST, SPLUNK_PORT
from logger import get_logger

logger = get_logger(__name__)

SAVED_SEARCH_PREFIX = "QueryTester_Scheduled_"


def _connect(session_key):
    # type: (str) -> Any
    return splunk_client.connect(
        host=SPLUNK_HOST, port=SPLUNK_PORT,
        splunkToken=session_key, app="QueryTester", owner="admin",
    )


def _is_enabled(record):
    # type: (Dict[str, Any]) -> bool
    """Normalize enabled field — handles bool, str '1'/'0', 'true'/'false'."""
    val = record.get("enabled", True)
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("1", "true", "yes")
    return bool(val)


def saved_search_name(record_id):
    # type: (str) -> str
    return SAVED_SEARCH_PREFIX + record_id


def create_saved_search(session_key, record):
    # type: (str, Dict[str, Any]) -> None
    service = _connect(session_key)
    name = saved_search_name(record["id"])
    spl = '| makeresults | eval test_id="{0}"'.format(record["id"])
    try:
        service.saved_searches.create(
            name,
            search=spl,
            **{
                "cron_schedule": record.get("cronSchedule", "0 6 * * *"),
                "is_scheduled": "1",
                "disabled": "0" if _is_enabled(record) else "1",
            }
        )
        logger.info("Created saved search: %s", name)
    except Exception as exc:
        logger.warning("Failed to create saved search %s: %s", name, exc)


def update_saved_search(session_key, record):
    # type: (str, Dict[str, Any]) -> None
    service = _connect(session_key)
    name = saved_search_name(record["id"])
    try:
        ss = service.saved_searches[name]
        ss.update(
            cron_schedule=record.get("cronSchedule", "0 6 * * *"),
            disabled="0" if _is_enabled(record) else "1",
        )
        logger.info("Updated saved search: %s", name)
    except KeyError:
        logger.warning("Saved search %s not found, recreating.", name)
        create_saved_search(session_key, record)
    except Exception as exc:
        logger.warning("Failed to update saved search %s: %s", name, exc)
        # Try recreating if update failed
        try:
            create_saved_search(session_key, record)
        except Exception:
            pass


def delete_saved_search(session_key, record_id):
    # type: (str, str) -> None
    service = _connect(session_key)
    name = saved_search_name(record_id)
    try:
        service.saved_searches.delete(name)
        logger.info("Deleted saved search: %s", name)
    except KeyError:
        logger.warning("Saved search %s not found during delete.", name)
