#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
query_tester.py
Splunk REST entry point for the Query Tester backend.
Uses PersistentServerConnectionApplication (scripttype = persist).
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Tuple

# Add bin/ to sys.path so sibling modules (logger, core, spl, etc.) are importable
_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from splunk.persistconn.application import PersistentServerConnectionApplication

from logger import get_logger
from core.test_runner import TestRunner

# HEC token is read from config.py (HEC_TOKEN) or QUERY_TESTER_HEC_TOKEN env var.
# See bin/config.py to set it.

logger = get_logger(__name__)


def _get_session_key(in_string: str) -> str:
    """Extract the session key from the persistent connection input."""
    request = json.loads(in_string) if isinstance(in_string, str) else in_string
    session = request.get("session") or {}
    key = (
        session.get("authtoken")
        or session.get("sessionKey")
        or request.get("system_authtoken")
    )
    if not key:
        raise ValueError("Missing session key in request.")
    return key


def _normalize_payload(raw_body: Any) -> Dict[str, Any]:
    """Parse the POST body into a dict."""
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


def _json_response(data: Dict[str, Any], status: int = 200) -> Dict[str, Any]:
    """Build a persistent-connection response dict."""
    return {
        "payload": json.dumps(data, default=str),
        "status": status,
        "headers": {
            "Content-Type": "application/json",
        },
    }


class QueryTesterHandler(PersistentServerConnectionApplication):
    """
    Splunk PersistentServerConnectionApplication handler.
    Registered via restmap.conf with scripttype = persist.

    The handler instance persists across requests, allowing a DELETE to
    cancel a search job started by a previous POST.
    """

    def __init__(self, command_line: str = "", command_arg: str = "") -> None:
        super().__init__()
        self._current_runner = None  # type: Any

    def handle(self, in_string: str) -> Dict[str, Any]:
        """
        Router — Splunk calls this for every request.
        in_string is a JSON blob with method, rest_path, query, payload, session, etc.
        """
        try:
            request = json.loads(in_string)
        except Exception:
            return _json_response({"status": "error", "message": "Bad request"}, 400)

        method = request.get("method", "GET").upper()

        if method == "GET":
            return self._handle_get(request)
        elif method == "POST":
            return self._handle_post(request)
        elif method == "DELETE":
            return self._handle_delete(request)
        else:
            return _json_response(
                {"status": "error", "message": "Method not allowed: " + method}, 405
            )

    def _handle_get(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Health check."""
        return _json_response({"status": "ok", "service": "query_tester"})

    def _handle_post(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Run a test."""
        try:
            session_key = _get_session_key(request)
            raw_body = request.get("payload")
            payload = _normalize_payload(raw_body)

            runner = TestRunner(session_key)
            self._current_runner = runner
            result, status_code = runner.run_test(payload)
            return _json_response(result, status_code)
        except Exception as exc:
            logger.error("Error handling POST: %s", str(exc), exc_info=True)
            return _json_response(
                {
                    "status": "error",
                    "message": "Internal server error.",
                    "testName": "",
                    "testType": "",
                    "timestamp": "",
                    "totalScenarios": 0,
                    "passedScenarios": 0,
                    "errors": [{"code": "INTERNAL_ERROR", "message": "Internal server error.", "severity": "error"}],
                    "warnings": [],
                    "splAnalysis": {
                        "unauthorizedCommands": [],
                        "unusualCommands": [],
                        "uniqLimitations": None,
                        "commandsUsed": [],
                    },
                    "scenarioResults": [],
                },
                500,
            )
        finally:
            self._current_runner = None

    def _handle_delete(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel the currently running test."""
        runner = self._current_runner
        if runner is None:
            return _json_response({"status": "ok", "message": "No test running."})

        try:
            runner.cancel()
            return _json_response({"status": "ok", "message": "Test cancelled."})
        except Exception as exc:
            logger.error("Error cancelling test: %s", str(exc), exc_info=True)
            return _json_response(
                {"status": "error", "message": str(exc)}, 500
            )
