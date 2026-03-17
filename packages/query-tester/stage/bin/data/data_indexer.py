# -*- coding: utf-8 -*-
"""
data_indexer.py
Index synthetic events into the temp Splunk index via HEC (HTTP Event Collector).
"""
from __future__ import annotations

import json
import os
import ssl
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from logger import get_logger
from config import (
    HEC_HOST, HEC_PORT, HEC_SCHEME, HEC_TOKEN, HEC_SSL_VERIFY,
    HEC_TIMEOUT, HEC_BATCH_SIZE, TEMP_INDEX, TEMP_SOURCETYPE,
)
from splunk_connect import get_service


logger = get_logger(__name__)

BATCH_SIZE = HEC_BATCH_SIZE
HEC_URL = "{0}://{1}:{2}/services/collector/event".format(HEC_SCHEME, HEC_HOST, HEC_PORT)

# Build SSL context from config
_SSL_CTX = ssl.create_default_context()
if not HEC_SSL_VERIFY:
    _SSL_CTX.check_hostname = False
    _SSL_CTX.verify_mode = ssl.CERT_NONE


def _get_hec_config(session_key=None):
    # type: (Optional[str]) -> Dict[str, Any]
    """Get HEC config from runtime config or fall back to static config."""
    if session_key:
        try:
            from runtime_config import get_runtime_config
            cfg = get_runtime_config(session_key)
            return {
                "hec_host": cfg.get("hec_host", HEC_HOST),
                "hec_port": int(cfg.get("hec_port", HEC_PORT)),
                "hec_scheme": cfg.get("hec_scheme", HEC_SCHEME),
                "hec_token": cfg.get("hec_token", HEC_TOKEN),
                "hec_ssl_verify": cfg.get("hec_ssl_verify", HEC_SSL_VERIFY),
                "hec_timeout": int(cfg.get("hec_timeout", HEC_TIMEOUT)),
                "temp_index": cfg.get("temp_index", TEMP_INDEX),
                "temp_sourcetype": cfg.get("temp_sourcetype", TEMP_SOURCETYPE),
            }
        except Exception as exc:
            logger.debug("Runtime config unavailable, using static: %s", exc)
    return {
        "hec_host": HEC_HOST,
        "hec_port": HEC_PORT,
        "hec_scheme": HEC_SCHEME,
        "hec_token": HEC_TOKEN,
        "hec_ssl_verify": HEC_SSL_VERIFY,
        "hec_timeout": HEC_TIMEOUT,
        "temp_index": TEMP_INDEX,
        "temp_sourcetype": TEMP_SOURCETYPE,
    }


def _get_hec_token(session_key=None):
    # type: (Optional[str]) -> str
    """Read the HEC token from runtime config, static config, or environment."""
    if session_key:
        cfg = _get_hec_config(session_key)
        token = cfg.get("hec_token", "")
        if token:
            return token
    token = HEC_TOKEN or os.environ.get("QUERY_TESTER_HEC_TOKEN", "")
    if not token:
        raise RuntimeError(
            "HEC token is not configured. Set HEC_TOKEN in bin/config.py "
            "or export QUERY_TESTER_HEC_TOKEN environment variable."
        )
    return token


def index_events(
    events: List[Dict[str, Any]], run_id: str, session_key: str
) -> None:
    """
    Index all events into the temp index via HEC, tagged with run_id.
    session_key is accepted for interface compatibility but not used for HEC.
    """
    if not events:
        logger.warning(
            "index_events called with empty list for run_id=%s — skipping",
            run_id,
        )
        return

    # Filter out empty or non-dict entries
    filtered_events = [
        event for event in events if isinstance(event, dict) and event
    ]  # type: List[Dict[str, Any]]
    if not filtered_events:
        logger.warning(
            "index_events received only empty or non-dict events "
            "for run_id=%s — skipping",
            run_id,
        )
        return

    hec_cfg = _get_hec_config(session_key)
    hec_token = hec_cfg["hec_token"] or _get_hec_token(session_key)
    hec_url = "{0}://{1}:{2}/services/collector/event".format(
        hec_cfg["hec_scheme"], hec_cfg["hec_host"], hec_cfg["hec_port"],
    )
    hec_timeout = int(hec_cfg["hec_timeout"])
    ssl_ctx = ssl.create_default_context()
    if not hec_cfg["hec_ssl_verify"]:
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
    idx = hec_cfg["temp_index"]
    srctype = hec_cfg["temp_sourcetype"]

    for start in range(0, len(filtered_events), BATCH_SIZE):
        batch = filtered_events[start : start + BATCH_SIZE]
        _send_hec_batch(batch, run_id, hec_token,
                        hec_url=hec_url, hec_timeout=hec_timeout,
                        ssl_ctx=ssl_ctx, index=idx, sourcetype=srctype)
        logger.info(
            "Indexed batch %d-%d (%d events) for run_id=%s",
            start,
            start + len(batch),
            len(batch),
            run_id,
        )


def _run_id_field(run_id: str) -> str:
    """Return the unique run_id field name for this run, e.g. run_id_6d1f4ac7."""
    return "run_id_{0}".format(run_id)


def cleanup(run_id: str, session_key: str) -> None:
    """
    Delete all temp events for this run. Errors are logged, not raised.
    """
    field_name = _run_id_field(run_id)
    spl = 'search index={0} {1}="{2}" | delete'.format(
        TEMP_INDEX, field_name, run_id
    )
    try:
        _run_spl(session_key, spl)
        logger.info("Cleaned up events for run_id=%s", run_id)
    except Exception as exc:
        logger.warning("Cleanup failed for run_id=%s: %s", run_id, exc)


def _send_hec_batch(
    events,       # type: List[Dict[str, Any]]
    run_id,       # type: str
    hec_token,    # type: str
    hec_url=None,      # type: str
    hec_timeout=None,  # type: int
    ssl_ctx=None,      # type: Any
    index=None,        # type: str
    sourcetype=None,   # type: str
):
    # type: (...) -> None
    """
    Send a batch of events to HEC in a single POST request.
    """
    url = hec_url or HEC_URL
    timeout = hec_timeout or HEC_TIMEOUT
    ctx = ssl_ctx or _SSL_CTX
    idx = index or TEMP_INDEX
    srctype = sourcetype or TEMP_SOURCETYPE

    lines = []  # type: List[str]
    for event in events:
        # Convert None values to empty strings so json.dumps doesn't produce "null"
        sanitized = {k: ("" if v is None else v) for k, v in event.items()}
        envelope = {
            "event": sanitized,
            "index": idx,
            "sourcetype": srctype,
            "fields": {_run_id_field(run_id): run_id},
        }
        lines.append(json.dumps(envelope, ensure_ascii=False))

    body = "\n".join(lines).encode("utf-8")

    req = Request(url, data=body, method="POST")
    req.add_header("Authorization", "Splunk {0}".format(hec_token))
    req.add_header("Content-Type", "application/json")

    try:
        response = urlopen(req, timeout=timeout, context=ctx)
        response_body = response.read().decode("utf-8")
        response.close()
    except HTTPError as exc:
        error_body = ""
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            pass
        raise RuntimeError(
            "HEC request failed for run_id={0}: "
            "HTTP {1} — {2}".format(run_id, exc.code, error_body)
        )
    except URLError as exc:
        raise RuntimeError(
            "HEC connection failed for run_id={0}: {1}. "
            "Verify HEC is enabled at {2}.".format(
                run_id, exc.reason, url
            )
        )

    # Verify HEC accepted the events
    try:
        result = json.loads(response_body)
    except (ValueError, TypeError):
        result = {}

    if result.get("code") != 0:
        raise RuntimeError(
            "HEC rejected events for run_id={0}: {1}".format(
                run_id, response_body
            )
        )


def _run_spl(session_key, spl):
    # type: (str, str) -> None
    """Execute SPL via splunklib — used only for cleanup deletes."""
    service = get_service(session_key, app="QueryTester", owner="nobody")
    job = service.jobs.create(spl)
    _ = job.results()
