# -*- coding: utf-8 -*-
"""
data_indexer.py
Index synthetic events into the temp Splunk index via HEC (HTTP Event Collector).
"""
from __future__ import annotations

import json
import os
import ssl
from typing import Any, Dict, List
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import splunklib.client as splunk_client

from logger import get_logger
from config import (
    HEC_HOST, HEC_PORT, HEC_SCHEME, HEC_TOKEN, HEC_SSL_VERIFY,
    HEC_TIMEOUT, HEC_BATCH_SIZE, TEMP_INDEX, TEMP_SOURCETYPE,
    SPLUNK_HOST, SPLUNK_PORT,
)


logger = get_logger(__name__)

BATCH_SIZE = HEC_BATCH_SIZE
HEC_URL = "{0}://{1}:{2}/services/collector/event".format(HEC_SCHEME, HEC_HOST, HEC_PORT)

# Build SSL context from config
_SSL_CTX = ssl.create_default_context()
if not HEC_SSL_VERIFY:
    _SSL_CTX.check_hostname = False
    _SSL_CTX.verify_mode = ssl.CERT_NONE


def _get_hec_token() -> str:
    """Read the HEC token from config or environment."""
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

    hec_token = _get_hec_token()

    for start in range(0, len(filtered_events), BATCH_SIZE):
        batch = filtered_events[start : start + BATCH_SIZE]
        _send_hec_batch(batch, run_id, hec_token)
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
    events: List[Dict[str, Any]], run_id: str, hec_token: str
) -> None:
    """
    Send a batch of events to HEC in a single POST request.
    """
    lines = []  # type: List[str]
    for event in events:
        # Convert None values to empty strings so json.dumps doesn't produce "null"
        sanitized = {k: ("" if v is None else v) for k, v in event.items()}
        envelope = {
            "event": sanitized,
            "index": TEMP_INDEX,
            "sourcetype": TEMP_SOURCETYPE,
            "fields": {_run_id_field(run_id): run_id},
        }
        lines.append(json.dumps(envelope, ensure_ascii=False))

    body = "\n".join(lines).encode("utf-8")

    req = Request(HEC_URL, data=body, method="POST")
    req.add_header("Authorization", "Splunk {0}".format(hec_token))
    req.add_header("Content-Type", "application/json")

    try:
        response = urlopen(req, timeout=HEC_TIMEOUT, context=_SSL_CTX)
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
            "Verify HEC is enabled on {2}:{3}.".format(
                run_id, exc.reason, HEC_HOST, HEC_PORT
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


def _run_spl(session_key: str, spl: str) -> None:
    """Execute SPL via splunklib — used only for cleanup deletes."""
    service = splunk_client.connect(
        host=SPLUNK_HOST,
        port=SPLUNK_PORT,
        splunkToken=session_key,
    )
    job = service.jobs.create(spl)
    _ = job.results()
