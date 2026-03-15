# -*- coding: utf-8 -*-
"""
saved_tests_handler.py — REST handler for saved test library CRUD.
Stores test definitions in KVStore. List endpoint returns lightweight
metadata; get-by-id returns the full definition.
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
from typing import Any, Dict, List, Optional

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient

logger = get_logger(__name__)

COLLECTION = "saved_tests"
SCHEDULED_COLLECTION = "scheduled_tests"

META_FIELDS = [
    "id", "name", "app", "testType", "validationType",
    "createdAt", "updatedAt", "createdBy", "scenarioCount", "description",
]


def _get_session_key(request):
    # type: (Dict[str, Any]) -> str
    session = request.get("session") or {}
    key = (
        session.get("authtoken")
        or session.get("sessionKey")
        or request.get("system_authtoken")
    )
    if not key:
        raise ValueError("Missing session key in request.")
    return key


def _get_username(request):
    # type: (Dict[str, Any]) -> str
    session = request.get("session") or {}
    return session.get("user", "unknown")


def _json_response(data, status=200):
    # type: (Any, int) -> Dict[str, Any]
    return {
        "payload": json.dumps(data, default=str),
        "status": status,
        "headers": {"Content-Type": "application/json"},
    }


def _normalize_payload(raw_body):
    # type: (Any) -> Dict[str, Any]
    if raw_body is None:
        return {}
    if isinstance(raw_body, (list, tuple)) and raw_body:
        raw_body = raw_body[0]
    if isinstance(raw_body, bytes):
        raw_body = raw_body.decode("utf-8")
    if isinstance(raw_body, str):
        if not raw_body.strip():
            return {}
        return json.loads(raw_body)
    if isinstance(raw_body, dict):
        return raw_body
    raise ValueError("Unsupported payload type: {0}".format(type(raw_body).__name__))


def _extract_id(request):
    # type: (Dict[str, Any]) -> Optional[str]
    query = request.get("query") or []
    if isinstance(query, dict):
        val = query.get("id")
        if val:
            return str(val)
    elif isinstance(query, list):
        for qp in query:
            if isinstance(qp, (list, tuple)) and len(qp) == 2 and qp[0] == "id":
                return str(qp[1])
    rest_path = request.get("rest_path", "")
    parts = rest_path.strip("/").split("/")
    if len(parts) >= 3:
        return parts[-1]
    return None


def _now_iso():
    # type: () -> str
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _strip_to_meta(record):
    # type: (Dict[str, Any]) -> Dict[str, Any]
    return {k: record.get(k) for k in META_FIELDS}


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
            return _json_response({"error": "Bad request"}, 400)

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
                return _json_response({"error": "Method not allowed"}, 405)
        except ValueError as exc:
            logger.warning("Client error: %s", str(exc))
            return _json_response({"error": str(exc)}, 400)
        except Exception as exc:
            logger.error("Server error: %s", str(exc), exc_info=True)
            return _json_response({"error": "Internal server error"}, 500)

    def _handle_get(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        kv = KVStoreClient(session_key)
        records = kv.get_all(COLLECTION)
        for r in records:
            if isinstance(r.get("definition"), str):
                try:
                    r["definition"] = json.loads(r["definition"])
                except (json.JSONDecodeError, TypeError):
                    r["definition"] = {}
        return _json_response(_sort_by_updated(records))

    def _handle_post(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        payload = _normalize_payload(request.get("payload"))
        now = _now_iso()
        definition = payload.get("definition", {})

        record = {
            "id": str(uuid.uuid4()),
            "name": payload.get("name", ""),
            "app": payload.get("app", ""),
            "testType": payload.get("testType", "standard"),
            "validationType": payload.get("validationType", "standard"),
            "createdAt": now,
            "updatedAt": now,
            "createdBy": _get_username(request),
            "scenarioCount": payload.get("scenarioCount", 0),
            "description": payload.get("description", ""),
            "definition": json.dumps(definition) if isinstance(definition, dict) else definition,
        }
        kv = KVStoreClient(session_key)
        kv.upsert(COLLECTION, record["id"], record)
        logger.info("Created saved test: %s", record["id"])

        record["definition"] = definition
        return _json_response(record, 201)

    def _handle_put(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        record_id = _extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")

        payload = _normalize_payload(request.get("payload"))
        kv = KVStoreClient(session_key)
        existing = kv.get_by_id(COLLECTION, record_id)

        # Preserve immutable fields
        created_at = existing.get("createdAt")
        created_by = existing.get("createdBy")

        existing.update(payload)
        existing["id"] = record_id
        existing["createdAt"] = created_at
        existing["createdBy"] = created_by
        existing["updatedAt"] = _now_iso()

        definition = existing.get("definition", {})
        if isinstance(definition, dict):
            existing["definition"] = json.dumps(definition)

        kv.upsert(COLLECTION, record_id, existing)
        logger.info("Updated saved test: %s", record_id)

        if isinstance(existing.get("definition"), str):
            existing["definition"] = json.loads(existing["definition"])
        return _json_response(existing)

    def _handle_delete(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        record_id = _extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")

        kv = KVStoreClient(session_key)

        # Check for active schedules referencing this test
        scheduled = kv.query(SCHEDULED_COLLECTION, {"testId": record_id})
        if scheduled:
            raise ValueError(
                "Cannot delete: this test has an active schedule. "
                "Remove the schedule first."
            )

        kv.delete(COLLECTION, record_id)
        logger.info("Deleted saved test: %s", record_id)
        return _json_response({"deleted": record_id})
