from __future__ import annotations

import json
import logging
import ssl
import time

from .constants import LLM_TIMEOUT_SECS, MAX_RESPONSE_TOKENS, MIN_INTERVAL_SECS

_logger = logging.getLogger("aiguy")


def get_llm_config(_session_key):
    # type: (str) -> dict
    """Read LLM settings from config.py. No KVStore, no HTTP calls."""
    import config as cfg

    endpoint = getattr(cfg, "LLM_ENDPOINT", "").strip()
    api_key = getattr(cfg, "LLM_API_KEY", "").strip()
    model = getattr(cfg, "LLM_MODEL", "gpt-4o-mini").strip()
    max_tokens = int(getattr(cfg, "LLM_MAX_TOKENS", 1024) or 1024)

    if not endpoint:
        raise ValueError("LLM_ENDPOINT not set in config.py.")
    if not api_key:
        raise ValueError("LLM_API_KEY not set in config.py.")

    return {
        "endpoint": endpoint,
        "model": model,
        "max_tokens": min(max_tokens, MAX_RESPONSE_TOKENS),
        "api_key": api_key,
    }


def call_llm(llm_cfg, system_prompt, user_message):
    # type: (dict, str, str) -> str
    """Single HTTPS POST to the LLM endpoint."""
    try:
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError, URLError
    except ImportError:
        from urllib2 import Request, urlopen, HTTPError, URLError

    body = json.dumps({
        "model": llm_cfg["model"],
        "max_tokens": llm_cfg["max_tokens"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }).encode("utf-8")

    req = Request(llm_cfg["endpoint"], data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + llm_cfg["api_key"])

    ctx = ssl._create_unverified_context()
    try:
        resp = urlopen(req, timeout=LLM_TIMEOUT_SECS, context=ctx)
        data = json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")[:200]
        raise ValueError("LLM HTTP {0}: {1}".format(exc.code, err))
    except URLError as exc:
        raise ValueError("Cannot reach LLM: {0}".format(exc.reason))

    choice = (data.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content", "")
    if not content:
        content = data.get("content", "") or data.get("output", "") or ""
    return content or "(no response from AI)"


def should_skip_scheduled(session_key, saved_search_name):
    # type: (str, str) -> bool
    """Check if this scheduled search ran less than 10 min ago."""
    if not saved_search_name or not session_key:
        return False
    try:
        import config as cfg
        import datetime
        from splunklib import client as splunk_client

        service = splunk_client.Service(
            token=session_key,
            host=cfg.SPLUNK_HOST,
            port=cfg.SPLUNK_PORT,
            scheme=cfg.SPLUNK_SCHEME,
            app="QueryTester",
            owner="nobody",
        )
        ss = service.saved_searches[saved_search_name]
        jobs = ss.history()
        if len(jobs) < 2:
            return False
        prev = jobs[1]
        try:
            dispatch_time = prev["published"] or ""
        except (KeyError, AttributeError):
            return False
        if not dispatch_time:
            return False
        clean = str(dispatch_time).split(".")[0].replace("T", " ")
        dt = datetime.datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
        age_secs = (datetime.datetime.utcnow() - dt).total_seconds()
        if age_secs < MIN_INTERVAL_SECS:
            return True
    except Exception:
        pass
    return False


def log_usage(mode, field, prompt, source, row_count, t_start):
    # type: (str, str, str, str, int, float) -> None
    """Log usage to stderr -> Splunk _internal index."""
    try:
        dur = int((time.time() - t_start) * 1000)
        _logger.info(
            "aiguy mode=%s field=%s source=%s rows=%d duration=%dms prompt=%s",
            mode or "prompt", field or "-", source,
            row_count, dur, (prompt or "-")[:100],
        )
    except Exception:
        pass
