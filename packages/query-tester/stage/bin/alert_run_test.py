# -*- coding: utf-8 -*-
"""
alert_run_test.py — Custom alert action entry point.
Called by Splunk scheduler when a scheduled test's saved search fires.
Orchestrates: fetch test -> check SPL drift -> run test -> record history -> email.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import uuid
from typing import Any, Dict, List, Optional

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from config import SPLUNK_HOST, SPLUNK_PORT
from logger import get_logger
from kvstore_client import KVStoreClient
from alert_email import send_failure_emails

import splunklib.client as splunk_client

logger = get_logger(__name__)

SCHEDULED_COLLECTION = "scheduled_tests"
HISTORY_COLLECTION = "test_run_history"


def _compute_spl_hash(spl):
    # type: (str) -> str
    return hashlib.md5(spl.encode("utf-8")).hexdigest()[:12]


def _get_test_id_from_payload(payload_path):
    # type: (str) -> str
    with open(payload_path, "r") as f:
        payload = json.load(f)
    config = payload.get("configuration", {})
    test_id = config.get("test_id", "")
    if not test_id:
        raise ValueError("test_id not found in alert action payload.")
    return test_id


def _fetch_current_spl(session_key, saved_search_name):
    # type: (str, str) -> Optional[str]
    """Fetch the current SPL from a Splunk saved search."""
    service = splunk_client.connect(
        host=SPLUNK_HOST, port=SPLUNK_PORT,
        splunkToken=session_key, app="QueryTester", owner="admin",
    )
    try:
        ss = service.saved_searches[saved_search_name]
        return ss["search"]
    except (KeyError, Exception) as exc:
        logger.warning("Could not fetch saved search %s: %s", saved_search_name, exc)
        return None


def _check_spl_drift(session_key, saved_search_origin, stored_hash):
    # type: (str, str, str) -> tuple
    """Compare current SPL hash against stored hash.

    Returns (spl_drift_detected, current_spl, current_hash).
    """
    current_spl = _fetch_current_spl(session_key, saved_search_origin)
    if current_spl is None:
        return False, None, stored_hash
    current_hash = _compute_spl_hash(current_spl)
    drift = stored_hash != "" and current_hash != stored_hash
    if drift:
        logger.info("SPL drift detected for %s: stored=%s current=%s",
                     saved_search_origin, stored_hash, current_hash)
    return drift, current_spl, current_hash


def _extract_scenario_results(result):
    # type: (Dict[str, Any]) -> List[Dict[str, Any]]
    out = []
    for sr in result.get("scenarioResults", []):
        out.append({
            "scenarioId": sr.get("scenarioId", ""),
            "scenarioName": sr.get("scenarioName", ""),
            "passed": sr.get("passed", False),
            "message": sr.get("message", ""),
        })
    return out


def run(payload_path, session_key):
    # type: (str, str) -> None
    test_id = _get_test_id_from_payload(payload_path)
    logger.info("Alert action triggered for test_id: %s", test_id)

    kv = KVStoreClient(session_key)
    try:
        scheduled = kv.get_by_id(SCHEDULED_COLLECTION, test_id)
    except ValueError:
        logger.error("Scheduled test not found: %s", test_id)
        return

    if not scheduled.get("enabled", True):
        logger.info("Scheduled test %s is disabled, skipping.", test_id)
        return

    # SPL drift check
    spl_drift = False
    spl_hash = ""
    saved_search_origin = scheduled.get("savedSearchOrigin")
    stored_hash = scheduled.get("splSnapshotHash", "")
    if saved_search_origin:
        spl_drift, _, spl_hash = _check_spl_drift(
            session_key, saved_search_origin, stored_hash,
        )
    if not spl_hash:
        spl_hash = stored_hash

    # Run the test (always uses current SPL via the test runner)
    from core.test_runner import TestRunner
    start_ms = int(time.time() * 1000)
    status = "error"
    result = {}  # type: Dict[str, Any]
    try:
        runner = TestRunner(session_key)
        result, _ = runner.run_test({"testId": scheduled.get("testId", "")})
        raw_status = result.get("status", "error")
        status = raw_status if raw_status in ("pass", "fail") else "error"
    except Exception as exc:
        logger.error("Test execution failed: %s", exc, exc_info=True)
        result = {"status": "error", "message": str(exc)}

    duration_ms = int(time.time() * 1000) - start_ms
    ran_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    scenario_results = _extract_scenario_results(result)
    passed = result.get("passedScenarios", 0)
    total = result.get("totalScenarios", 0)
    summary = "Status: {0}, Passed: {1}/{2}".format(status, passed, total)

    # Write history record
    record = {
        "id": str(uuid.uuid4()),
        "scheduledTestId": test_id,
        "ranAt": ran_at,
        "status": status,
        "durationMs": duration_ms,
        "splSnapshotHash": spl_hash,
        "splDriftDetected": spl_drift,
        "resultSummary": summary,
        "scenarioResults": json.dumps(scenario_results),
    }
    kv.upsert(HISTORY_COLLECTION, record["id"], record)

    # Update scheduled test with last run info + latest hash
    scheduled["lastRunAt"] = ran_at
    scheduled["lastRunStatus"] = status
    if spl_hash:
        scheduled["splSnapshotHash"] = spl_hash
    kv.upsert(SCHEDULED_COLLECTION, test_id, scheduled)

    logger.info("Scheduled test %s completed: status=%s, duration=%dms",
                test_id, status, duration_ms)

    # Send failure emails
    if status in ("fail", "error") and scheduled.get("alertOnFailure"):
        recipients = scheduled.get("emailRecipients", [])
        send_failure_emails(
            recipients,
            scheduled.get("testName", test_id),
            ran_at, status, scenario_results, spl_drift,
        )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("No payload path provided to alert action.")
        sys.exit(1)

    payload_file = sys.argv[1] if sys.argv[1] != "--execute" else sys.argv[2]

    try:
        stdin_data = sys.stdin.read()
        stdin_payload = json.loads(stdin_data)
        _session_key = stdin_payload.get("session_key", "")
    except Exception:
        _session_key = ""

    if not _session_key:
        logger.error("No session key available for alert action.")
        sys.exit(1)

    run(payload_file, _session_key)
