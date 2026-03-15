# -*- coding: utf-8 -*-
"""
handler_utils.py — Shared utilities for all REST handlers.
Extracts session info, builds responses, normalizes payloads.
"""
from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional


def get_session_key(request):
    # type: (Dict[str, Any]) -> str
    """Extract the Splunk session key from a REST request."""
    session = request.get("session") or {}
    key = (
        session.get("authtoken")
        or session.get("sessionKey")
        or request.get("system_authtoken")
    )
    if not key:
        raise ValueError("Missing session key in request.")
    return key


def get_username(request):
    # type: (Dict[str, Any]) -> str
    """Extract the authenticated username from the session."""
    session = request.get("session") or {}
    return session.get("user", "unknown")


def json_response(data, status=200):
    # type: (Any, int) -> Dict[str, Any]
    """Build a Splunk REST JSON response dict."""
    return {
        "payload": json.dumps(data, default=str),
        "status": status,
        "headers": {"Content-Type": "application/json"},
    }


def normalize_payload(raw_body):
    # type: (Any) -> Dict[str, Any]
    """Parse the request payload into a dict, handling all Splunk formats."""
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


def extract_id(request):
    # type: (Dict[str, Any]) -> Optional[str]
    """Extract a record ID from query params, form params, or URL path."""
    # Check query params
    query = request.get("query") or []
    if isinstance(query, dict):
        val = query.get("id")
        if val:
            return str(val)
    elif isinstance(query, list):
        for qp in query:
            if isinstance(qp, (list, tuple)) and len(qp) == 2 and qp[0] == "id":
                return str(qp[1])
    # Check form params (Splunk sometimes puts query params here)
    form = request.get("form") or []
    if isinstance(form, dict):
        val = form.get("id")
        if val:
            return str(val)
    elif isinstance(form, list):
        for fp in form:
            if isinstance(fp, (list, tuple)) and len(fp) == 2 and fp[0] == "id":
                return str(fp[1])
    # Check URL path
    rest_path = request.get("rest_path", "")
    parts = rest_path.strip("/").split("/")
    if len(parts) >= 3:
        return parts[-1]
    return None


def get_query_param(request, param):
    # type: (Dict[str, Any], str) -> str
    """Extract a single named query parameter from the request."""
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


def now_iso():
    # type: () -> str
    """Return the current UTC time as an ISO 8601 string."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
