# -*- coding: utf-8 -*-
"""
scheduled_tests_handler.py — REST handler for scheduled test CRUD.
Creates/updates/deletes KVStore records and backing Splunk saved searches.
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from typing import Any, Dict

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient
from handler_utils import (
    get_session_key, json_response, normalize_payload, extract_id, now_iso,
)
from scheduled_search_manager import (
    create_saved_search, update_saved_search, delete_saved_search,
)

logger = get_logger(__name__)

COLLECTION_SCHEDULED_TESTS = "scheduled_tests"


def _build_record(payload):
    # type: (Dict[str, Any]) -> Dict[str, Any]
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
        record = _build_record(payload)
        kv = KVStoreClient(session_key)
        kv.upsert(COLLECTION_SCHEDULED_TESTS, record["id"], record)
        create_saved_search(session_key, record)
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
        existing.update(payload)
        existing["id"] = record_id
        kv.upsert(COLLECTION_SCHEDULED_TESTS, record_id, existing)
        # Update saved search — non-fatal if it fails
        try:
            update_saved_search(session_key, existing)
        except Exception as exc:
            logger.warning("Saved search update failed for %s: %s", record_id, exc)
        logger.info("Updated scheduled test: %s", record_id)
        return json_response(existing)

    def _handle_delete(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        record_id = extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")
        kv = KVStoreClient(session_key)
        kv.delete(COLLECTION_SCHEDULED_TESTS, record_id)
        delete_saved_search(session_key, record_id)
        logger.info("Deleted scheduled test: %s", record_id)
        return json_response({"deleted": record_id})
