# -*- coding: utf-8 -*-
"""
run_history_handler.py — REST handler for test run history.
GET /data/test_run_history?scheduled_test_id={id} → last 50 records.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from kvstore_client import KVStoreClient

logger = get_logger(__name__)

COLLECTION = "test_run_history"
MAX_HISTORY = 50


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


def _get_query_param(request, param):
    # type: (Dict[str, Any], str) -> str
    """Extract a query parameter from the request."""
    query = request.get("query") or {}
    if isinstance(query, list):
        for pair in query:
            if isinstance(pair, (list, tuple)) and len(pair) == 2:
                if pair[0] == param:
                    return str(pair[1])
        return ""
    if isinstance(query, dict):
        return str(query.get(param, ""))
    return ""


class RunHistoryHandler(PersistentServerConnectionApplication):
    """Read-only handler for test run history."""

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
        if method != "GET":
            return _json_response({"error": "Method not allowed"}, 405)

        try:
            return self._handle_get(request)
        except ValueError as exc:
            logger.warning("Client error: %s", str(exc))
            return _json_response({"error": str(exc)}, 400)
        except Exception as exc:
            logger.error("Server error: %s", str(exc), exc_info=True)
            return _json_response({"error": "Internal server error"}, 500)

    def _handle_get(self, request):
        # type: (Dict[str, Any]) -> Dict[str, Any]
        session_key = _get_session_key(request)
        scheduled_test_id = _get_query_param(request, "scheduled_test_id")

        kv = KVStoreClient(session_key)

        if scheduled_test_id:
            records = kv.query(
                COLLECTION,
                {"scheduledTestId": scheduled_test_id},
            )
        else:
            records = kv.get_all(COLLECTION)

        # Sort by ranAt descending, limit to MAX_HISTORY
        records.sort(key=lambda r: r.get("ranAt", ""), reverse=True)
        records = records[:MAX_HISTORY]

        return _json_response(records)
