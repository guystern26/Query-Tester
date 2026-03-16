# -*- coding: utf-8 -*-
"""
scheduled_tests_handler.py — REST handler for scheduled test CRUD.
Creates/updates/deletes KVStore records and backing Splunk saved searches.
"""
from __future__ import annotations

import json
import os
import sys
import threading
import uuid
from typing import Any, Dict

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient
from handler_utils import (
    get_session_key, get_username, json_response,
    normalize_payload, extract_id, now_iso, is_admin_user,
)
from scheduled_search_manager import (
    create_saved_search, update_saved_search, delete_saved_search,
)

logger = get_logger(__name__)

COLLECTION_SCHEDULED_TESTS = "scheduled_tests"


def _async_saved_search(fn, session_key, record):
    # type: (Any, str, Dict[str, Any]) -> None
    """Run a saved search operation in a background thread."""
    try:
        fn(session_key, record)
    except Exception as exc:
        logger.warning("Async saved search op failed: %s", exc)


def _async_saved_search_delete(session_key, record_id):
    # type: (str, str) -> None
    """Run saved search deletion in a background thread."""
    try:
        delete_saved_search(session_key, record_id)
    except Exception as exc:
        logger.warning("Async saved search delete failed for %s: %s", record_id, exc)


def _build_record(payload, username="unknown"):
    # type: (Dict[str, Any], str) -> Dict[str, Any]
    record_id = payload.get("id") or str(uuid.uuid4())
    return {
        "id": record_id,
        "testId": payload.get("testId", ""),
        "testName": payload.get("testName", ""),
        "app": payload.get("app", ""),
        "savedSearchOrigin": payload.get("savedSearchOrigin"),
        "cronSchedule": payload.get("cronSchedule", "0 6 * * *"),
        "enabled": payload.get("enabled", True),
        "createdAt": payload.get("createdAt") or now_iso(),
        "createdBy": username,
        "lastRunAt": None,
        "lastRunStatus": None,
        "alertOnFailure": payload.get("alertOnFailure", False),
        "emailRecipients": payload.get("emailRecipients", []),
    }


class ScheduledTestsHandler(PersistentServerConnectionApplication):
    """CRUD handler for scheduled tests with backing Splunk saved searches."""

    def __init__(self, command_line="", command_arg=""):
        # type: (str, str) -> None
        super().__init__()

    def handle(self, in_string):
        # type: (str) -> Dict[str, Any]
        try:
            request = json.loads(in_string)
        except Exception:
            return json_response({"error": "Bad request"}, 400)

        method = request.get("method", "GET").upper()
        try:
            if method == "GET":
                return self._handle_get(request)
            elif method == "POST":
                return self._handle_post(request)
            elif method == "PUT":
                return self._handle_put(request)
            elif method == "DELETE":
                return self._handle_delete(request)
            else:
                return json_response({"error": "Method not allowed"}, 405)
        except ValueError as exc:
            logger.warning("Client error: %s", str(exc))
            return json_response({"error": str(exc)}, 400)
        except Exception as exc:
            logger.error("Server error: %s", str(exc), exc_info=True)
            return json_response({"error": "Internal server error"}, 500)

    def _handle_get(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        kv = KVStoreClient(session_key)
        records = kv.get_all(COLLECTION_SCHEDULED_TESTS)
        return json_response(records)

    def _handle_post(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        payload = normalize_payload(request.get("payload"))

        if not str(payload.get("testId", "")).strip():
            raise ValueError("testId is required.")
        if not str(payload.get("cronSchedule", "")).strip():
            raise ValueError("cronSchedule is required.")

        record = _build_record(payload, get_username(request))
        record["version"] = 1
        kv = KVStoreClient(session_key)
        kv.upsert(COLLECTION_SCHEDULED_TESTS, record["id"], record)
        # Fire-and-forget: create saved search in background thread
        threading.Thread(
            target=_async_saved_search,
            args=(create_saved_search, session_key, record),
            daemon=True,
        ).start()
        logger.info("Created scheduled test: %s", record["id"])
        return json_response(record, 201)

    def _handle_put(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        record_id = extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")
        payload = normalize_payload(request.get("payload"))
        kv = KVStoreClient(session_key)
        existing = kv.get_by_id(COLLECTION_SCHEDULED_TESTS, record_id)

        # Ownership check
        username = get_username(request)
        owner = existing.get("createdBy", "")
        if owner and username != owner and not is_admin_user(session_key, username):
            return json_response(
                {"error": "Forbidden: you can only modify your own schedules."}, 403
            )

        # Optimistic locking: compare client version to stored version
        stored_version = int(existing.get("version") or 0)
        client_version = payload.pop("version", None)
        if client_version is not None:
            if int(client_version) != stored_version:
                return json_response(
                    {"error": "conflict", "currentVersion": stored_version}, 409
                )

        existing.update(payload)
        existing["id"] = record_id
        existing["version"] = stored_version + 1
        kv.upsert(COLLECTION_SCHEDULED_TESTS, record_id, existing)
        # Fire-and-forget: update saved search in background thread
        threading.Thread(
            target=_async_saved_search,
            args=(update_saved_search, session_key, existing),
            daemon=True,
        ).start()
        logger.info("Updated scheduled test: %s", record_id)
        return json_response(existing)

    def _handle_delete(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        record_id = extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")
        kv = KVStoreClient(session_key)
        existing = kv.get_by_id(COLLECTION_SCHEDULED_TESTS, record_id)

        # Ownership check
        username = get_username(request)
        owner = existing.get("createdBy", "")
        if owner and username != owner and not is_admin_user(session_key, username):
            return json_response(
                {"error": "Forbidden: you can only delete your own schedules."}, 403
            )

        kv.delete(COLLECTION_SCHEDULED_TESTS, record_id)
        # Fire-and-forget: delete saved search in background thread
        threading.Thread(
            target=_async_saved_search_delete,
            args=(session_key, record_id),
            daemon=True,
        ).start()
        logger.info("Deleted scheduled test: %s", record_id)
        return json_response({"deleted": record_id})
