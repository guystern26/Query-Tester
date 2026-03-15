# -*- coding: utf-8 -*-
"""
scheduled_tests_handler.py — REST handler for scheduled test CRUD.
Creates/updates/deletes KVStore records and backing Splunk saved searches.
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
from typing import Any, Dict, Optional

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient
from scheduled_search_manager import (
    create_saved_search, update_saved_search, delete_saved_search,
)

logger = get_logger(__name__)

COLLECTION = "scheduled_tests"


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
    logger.debug("_extract_id query=%s type=%s", query, type(query).__name__)
    if isinstance(query, dict):
        val = query.get("id")
        if val:
            return str(val)
    elif isinstance(query, list):
        for qp in query:
            if isinstance(qp, (list, tuple)) and len(qp) == 2 and qp[0] == "id":
                return str(qp[1])
    # Also check form params (Splunk sometimes puts query params in form_params)
    form = request.get("form") or []
    if isinstance(form, dict):
        val = form.get("id")
        if val:
            return str(val)
    elif isinstance(form, list):
        for fp in form:
            if isinstance(fp, (list, tuple)) and len(fp) == 2 and fp[0] == "id":
                return str(fp[1])
    rest_path = request.get("rest_path", "")
    parts = rest_path.strip("/").split("/")
    if len(parts) >= 3:
        return parts[-1]
    return None


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
        "createdAt": payload.get("createdAt") or time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
        ),
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
        return _json_response(records)

    def _handle_post(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        payload = _normalize_payload(request.get("payload"))
        record = _build_record(payload)
        kv = KVStoreClient(session_key)
        kv.upsert(COLLECTION, record["id"], record)
        create_saved_search(session_key, record)
        logger.info("Created scheduled test: %s", record["id"])
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
        existing.update(payload)
        existing["id"] = record_id
        kv.upsert(COLLECTION, record_id, existing)
        # Update saved search — non-fatal if it fails
        try:
            update_saved_search(session_key, existing)
        except Exception as exc:
            logger.warning("Saved search update failed for %s: %s", record_id, exc)
        logger.info("Updated scheduled test: %s", record_id)
        return _json_response(existing)

    def _handle_delete(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        record_id = _extract_id(request)
        if not record_id:
            raise ValueError("Missing record ID in URL path.")
        kv = KVStoreClient(session_key)
        kv.delete(COLLECTION, record_id)
        delete_saved_search(session_key, record_id)
        logger.info("Deleted scheduled test: %s", record_id)
        return _json_response({"deleted": record_id})
