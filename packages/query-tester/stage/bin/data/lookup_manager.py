# -*- coding: utf-8 -*-
"""
lookup_manager.py
Create and delete temporary KVStore-backed lookups.

All temp lookups are KVStore collections with a transforms.conf definition,
so both ``| lookup`` and ``| outputlookup`` work correctly.

Uses admin credentials from config.py for collection/transforms creation
(requires conf-write capability that normal users may not have).
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import splunklib.client as splunk_client

from logger import get_logger
from config import SPLUNK_HOST, SPLUNK_PORT, SPLUNK_USERNAME, SPLUNK_PASSWORD


logger = get_logger(__name__)

TEMP_LOOKUP_PREFIX = "temp_lookup_"


_session_key_holder = {"key": None}  # type: Dict[str, Any]


def set_session_key(session_key):
    # type: (str) -> None
    """Store a session key for reuse by lookup operations."""
    _session_key_holder["key"] = session_key


def _admin_service(app="QueryTester"):
    # type: (str) -> Any
    """Connect using session key (preferred) or admin credentials fallback."""
    sk = _session_key_holder.get("key")
    if sk:
        try:
            return splunk_client.connect(
                host=SPLUNK_HOST,
                port=int(SPLUNK_PORT),
                token=sk,
                app=app,
                owner="nobody",
            )
        except Exception:
            logger.warning("Session key login failed, falling back to credentials")
    return splunk_client.connect(
        host=SPLUNK_HOST,
        port=int(SPLUNK_PORT),
        username=SPLUNK_USERNAME,
        password=SPLUNK_PASSWORD,
        app=app,
        owner="nobody",
    )


def _coll_name(run_id):
    # type: (str) -> str
    return TEMP_LOOKUP_PREFIX + run_id


def _deduplicate(events, fieldnames):
    # type: (List[Dict[str, Any]], List[str]) -> List[Dict[str, Any]]
    """Remove duplicate rows, preserving order."""
    seen = set()  # type: set
    unique = []  # type: List[Dict[str, Any]]
    for event in events:
        key = tuple(event.get(f, "") for f in fieldnames)
        if key not in seen:
            seen.add(key)
            unique.append(event)
    return unique


def create_temp_lookup(
    run_id, events, app, fields_list=None,
):
    # type: (str, List[Dict[str, Any]], str, Optional[str]) -> str
    """Create a KVStore collection + transforms definition, then insert events.

    Returns the lookup name (same as the collection name).
    """
    if not events:
        raise ValueError(
            "Cannot create lookup for run_id={0}: events list is empty".format(run_id)
        )

    lookup_name = _coll_name(run_id)
    coll_name = lookup_name

    fieldnames = list(events[0].keys())
    unique_events = _deduplicate(events, fieldnames)

    if not fields_list:
        fields = ["_key"] + [f for f in fieldnames if f != "_key"]
        fields_list = ", ".join(fields)

    try:
        service = _admin_service(app)
    except Exception as exc:
        logger.error("Failed to connect for lookup creation (run_id=%s): %s", run_id, exc)
        raise

    # Create KVStore collection
    try:
        service.kvstore.create(coll_name)
        logger.info("Created KVStore collection: %s", coll_name)
    except Exception as exc:
        if "409" not in str(exc) and "already exists" not in str(exc).lower():
            logger.error("Failed to create KVStore collection %s: %s", coll_name, exc)
            raise

    # Create transforms.conf lookup definition
    try:
        service.confs["transforms"].create(
            lookup_name,
            **{
                "collection": coll_name,
                "external_type": "kvstore",
                "fields_list": fields_list,
            }
        )
        logger.info("Created lookup definition: %s (fields: %s)", lookup_name, fields_list)
    except Exception as exc:
        if "409" not in str(exc) and "already exists" not in str(exc).lower():
            raise

    # Insert events
    coll = service.kvstore[coll_name]
    for event in unique_events:
        record = {k: str(v) if v is not None else "" for k, v in event.items()}
        coll.data.insert(json.dumps(record))

    if len(unique_events) < len(events):
        logger.info("Deduplicated lookup %s: %d -> %d rows",
                     lookup_name, len(events), len(unique_events))

    logger.info("Created lookup %s with %d rows in app=%s",
                 lookup_name, len(unique_events), app)
    return lookup_name


def delete_temp_lookup(run_id, app):
    # type: (str, str) -> None
    """Delete the KVStore collection + transforms definition."""
    lookup_name = _coll_name(run_id)
    coll_name = lookup_name

    try:
        service = _admin_service(app)
        try:
            service.confs["transforms"].delete(lookup_name)
            logger.info("Deleted lookup definition: %s", lookup_name)
        except Exception:
            pass
        try:
            service.kvstore.delete(coll_name)
            logger.info("Deleted KVStore collection: %s", coll_name)
        except Exception:
            pass
    except Exception as exc:
        logger.warning("Could not delete lookup run_id=%s app=%s: %s",
                        run_id, app, exc)


def create_temp_kvstore_lookup(lookup_name, fields_list, app):
    # type: (str, str, str) -> bool
    """Create a KVStore collection + transforms definition for cache macro temp lookups.

    Returns True on success.
    """
    coll_name = lookup_name.replace("-", "_").replace(".", "_")
    try:
        service = _admin_service(app)

        try:
            service.kvstore.create(coll_name)
            logger.info("Created KVStore collection: %s", coll_name)
        except Exception as exc:
            if "409" not in str(exc) and "already exists" not in str(exc).lower():
                raise

        try:
            service.confs["transforms"].create(
                lookup_name,
                **{
                    "collection": coll_name,
                    "external_type": "kvstore",
                    "fields_list": fields_list,
                }
            )
            logger.info("Created lookup definition: %s (fields: %s)",
                         lookup_name, fields_list)
        except Exception as exc:
            if "409" not in str(exc) and "already exists" not in str(exc).lower():
                raise

        return True
    except Exception as exc:
        logger.error("Failed to create KVStore lookup '%s': %s", lookup_name, exc)
        return False


def delete_temp_kvstore_lookup(lookup_name, app):
    # type: (str, str) -> None
    """Delete a cache macro temp KVStore collection + transforms definition."""
    coll_name = lookup_name.replace("-", "_").replace(".", "_")
    try:
        service = _admin_service(app)
        try:
            service.confs["transforms"].delete(lookup_name)
        except Exception:
            pass
        try:
            service.kvstore.delete(coll_name)
        except Exception:
            pass
        logger.info("Cleaned up cache KVStore lookup: %s", lookup_name)
    except Exception as exc:
        logger.warning("Failed to clean up '%s': %s", lookup_name, exc)
