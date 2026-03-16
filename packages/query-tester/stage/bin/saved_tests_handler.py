# -*- coding: utf-8 -*-
"""
saved_tests_handler.py — REST handler for saved test library CRUD.
Stores test definitions in KVStore.
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from typing import Any, Dict, List

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient
from handler_utils import (
    get_session_key, get_username, json_response,
    normalize_payload, extract_id, now_iso,
    check_ownership, check_version,
)
from scheduled_search_manager import delete_saved_search
from config import MAX_DEFINITION_SIZE_BYTES

logger = get_logger(__name__)

COLLECTION_SAVED_TESTS = "saved_tests"
COLLECTION_SCHEDULED_TESTS = "scheduled_tests"

META_FIELDS = [
    "id", "name", "app", "testType", "validationType",
    "createdAt", "updatedAt", "createdBy", "scenarioCount", "description",
]


def _sort_by_updated(records):
    # type: (List[Dict[str, Any]]) -> List[Dict[str, Any]]
    return sorted(records, key=lambda r: r.get("updatedAt", ""), reverse=True)


class SavedTestsHandler(PersistentServerConnectionApplication):
    """CRUD handler for the saved test library."""

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
        records = kv.get_all(COLLECTION_SAVED_TESTS)
        for rec in records:
            if isinstance(rec.get("definition"), str):
                try:
                    rec["definition"] = json.loads(rec["definition"])
                except (json.JSONDecodeError, TypeError):
                    rec["definition"] = {}
        return json_response(_sort_by_updated(records))

    def _handle_post(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        payload = normalize_payload(request.get("payload"))

        name = str(payload.get("name", "")).strip()
        if not name:
            raise ValueError("Test name is required.")

        timestamp = now_iso()
        definition = payload.get("definition", {})

        # Check definition size before writing
        definition_str = json.dumps(definition) if isinstance(definition, dict) else str(definition or "")
        if len(definition_str.encode("utf-8")) > MAX_DEFINITION_SIZE_BYTES:
            size_mb = len(definition_str.encode("utf-8")) / (1024 * 1024)
            raise ValueError(
                "Test definition is too large to save ({0:.1f} MB). "
                "Reduce the number of scenarios or events.".format(size_mb)
            )

        record = {
            "id": str(uuid.uuid4()),
            "name": payload.get("name", ""),
            "app": payload.get("app", ""),
            "testType": payload.get("testType", "standard"),
            "validationType": payload.get("validationType", "standard"),
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "createdBy": get_username(request),
            "scenarioCount": payload.get("scenarioCount", 0),
            "description": payload.get("description", ""),
            "definition": json.dumps(definition) if isinstance(definition, dict) else definition,
            "version": 1,
        }
        kv = KVStoreClient(session_key)
        kv.upsert(COLLECTION_SAVED_TESTS, record["id"], record)
        logger.info("Created saved test: %s", record["id"])

        record["definition"] = definition
        return json_response(record, 201)

    def _handle_put(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        record_id = extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")

        payload = normalize_payload(request.get("payload"))
        kv = KVStoreClient(session_key)
        existing = kv.get_by_id(COLLECTION_SAVED_TESTS, record_id)

        forbidden = check_ownership(existing, request, session_key)
        if forbidden:
            return forbidden

        conflict = check_version(existing, payload)
        if conflict:
            return conflict

        stored_version = int(existing.get("version") or 0)

        # Preserve immutable fields
        created_at = existing.get("createdAt")
        created_by = existing.get("createdBy")

        existing.update(payload)
        existing["id"] = record_id
        existing["createdAt"] = created_at
        existing["createdBy"] = created_by
        existing["updatedAt"] = now_iso()
        existing["version"] = stored_version + 1

        definition = existing.get("definition", {})
        definition_str = json.dumps(definition) if isinstance(definition, dict) else str(definition or "")
        if len(definition_str.encode("utf-8")) > MAX_DEFINITION_SIZE_BYTES:
            size_mb = len(definition_str.encode("utf-8")) / (1024 * 1024)
            raise ValueError(
                "Test definition is too large to save ({0:.1f} MB). "
                "Reduce the number of scenarios or events.".format(size_mb)
            )
        if isinstance(definition, dict):
            existing["definition"] = json.dumps(definition)

        kv.upsert(COLLECTION_SAVED_TESTS, record_id, existing)
        logger.info("Updated saved test: %s (version %d)", record_id, stored_version + 1)

        if isinstance(existing.get("definition"), str):
            existing["definition"] = json.loads(existing["definition"])
        return json_response(existing)

    def _handle_delete(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = get_session_key(request)
        record_id = extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")

        kv = KVStoreClient(session_key)
        existing = kv.get_by_id(COLLECTION_SAVED_TESTS, record_id)

        forbidden = check_ownership(existing, request, session_key)
        if forbidden:
            return forbidden

        # Cascade-delete any schedules referencing this test
        scheduled = kv.query(COLLECTION_SCHEDULED_TESTS, {"testId": record_id})
        for sched in scheduled:
            sched_id = sched.get("id", "")
            try:
                kv.delete(COLLECTION_SCHEDULED_TESTS, sched_id)
                delete_saved_search(session_key, sched_id)
                logger.info("Cascade-deleted schedule %s for test %s", sched_id, record_id)
            except Exception as exc:
                logger.warning("Failed to cascade-delete schedule %s: %s", sched_id, exc)

        kv.delete(COLLECTION_SAVED_TESTS, record_id)
        logger.info("Deleted saved test: %s", record_id)
        return json_response({"deleted": record_id})
