# -*- coding: utf-8 -*-
"""
scheduled_runner.py — Scripted input that runs scheduled tests on their cron.

Runs every 60 seconds via inputs.conf. For each enabled scheduled test,
checks if the current minute matches its cron expression and runs it.
"""
from __future__ import annotations

import json
import os
import sys
import time
from typing import Any, Dict, List

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from logger import get_logger
from kvstore_client import KVStoreClient
from scheduling.cron_matcher import cron_matches, is_enabled
from scheduling.spl_drift import diff_spl, get_last_passed_spl
from scheduling.scheduled_runner_helpers import (
    write_history_record, build_scenario_results,
    build_summary, build_test_payload,
)

logger = get_logger("scheduled_runner")

COLLECTION_SCHEDULED_TESTS = "scheduled_tests"
COLLECTION_SAVED_TESTS = "saved_tests"

STATUS_VALID = ("pass", "fail", "partial")


def _run_single_test(kv, session_key, scheduled):
    # type: (KVStoreClient, str, Dict[str, Any]) -> None
    """Run a single scheduled test and record the result."""
    sched_id = scheduled.get("id", "")
    test_id = scheduled.get("testId", "")
    start_ms = int(time.time() * 1000)

    logger.info("Running scheduled test %s (testId=%s)", sched_id, test_id)

    status = "error"
    result = {}  # type: Dict[str, Any]
    scenario_results = []  # type: List[Dict[str, Any]]
    definition = {}  # type: Dict[str, Any]
    query_spl = ""

    try:
        try:
            saved_test = kv.get_by_id(COLLECTION_SAVED_TESTS, test_id)
        except Exception:
            logger.error("Saved test %s not found for scheduled test %s",
                         test_id, sched_id)
            return

        definition = saved_test.get("definition", {})
        if isinstance(definition, str):
            definition = json.loads(definition)

        payload, query_spl = build_test_payload(definition, saved_test, scheduled)

        from core.test_runner import TestRunner
        runner = TestRunner(session_key)
        result, _ = runner.run_test(payload)
        raw_status = result.get("status", "error")
        status = raw_status if raw_status in STATUS_VALID else "error"
        scenario_results = build_scenario_results(result)
    except Exception as exc:
        logger.error("Test execution failed for %s: %s",
                     sched_id, exc, exc_info=True)

    duration_ms = int(time.time() * 1000) - start_ms
    ran_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    passed = result.get("passedScenarios", 0)
    total = result.get("totalScenarios", 0)
    summary = build_summary(passed, total, scenario_results)

    # SPL drift detection: compare current SPL against last passed run
    spl_drift = False
    spl_drift_details = ""
    if query_spl:
        last_passed_spl = get_last_passed_spl(kv, sched_id)
        if last_passed_spl and last_passed_spl.strip() != query_spl.strip():
            spl_drift = True
            spl_drift_details = diff_spl(last_passed_spl, query_spl)
            logger.info("SPL drift detected for %s: %s",
                        sched_id, spl_drift_details)

    write_history_record(
        kv, sched_id, ran_at, status, duration_ms, summary,
        scenario_results, current_spl=query_spl,
        spl_drift=spl_drift, spl_drift_details=spl_drift_details,
    )

    try:
        # Re-read from KVStore to avoid clobbering changes made during the run
        # (e.g. user disabled the test while it was running)
        fresh = kv.get_by_id(COLLECTION_SCHEDULED_TESTS, sched_id)
        fresh["lastRunAt"] = ran_at
        fresh["lastRunStatus"] = status
        kv.upsert(COLLECTION_SCHEDULED_TESTS, sched_id, fresh)
    except Exception as exc:
        logger.error("Failed to update scheduled test %s: %s", sched_id, exc)

    logger.info("Scheduled test %s completed: status=%s, duration=%dms",
                sched_id, status, duration_ms)

    alert_flag = scheduled.get("alertOnFailure", False)
    should_alert = alert_flag in (True, "1", "true", "True")
    if status in ("fail", "error") and should_alert:
        try:
            from alerts.alert_email import send_failure_emails
            recipients = scheduled.get("emailRecipients", [])
            full_scenario_results = result.get(
                "scenarioResults", scenario_results,
            )
            send_failure_emails(
                recipients,
                scheduled.get("testName", sched_id),
                ran_at, status, full_scenario_results, spl_drift,
                test_id=test_id,
                definition=definition,
                full_results=result if result else None,
                session_key=session_key,
            )
        except Exception as exc:
            logger.error("Failed to send failure emails: %s", exc)


def run(session_key):
    # type: (str) -> None
    """Main entry point. Check all scheduled tests and run those due now."""
    try:
        kv = KVStoreClient(session_key)
        all_tests = kv.get_all(COLLECTION_SCHEDULED_TESTS)
    except Exception as exc:
        logger.error("Failed to fetch scheduled tests: %s", exc)
        return

    if not all_tests:
        return

    now = time.localtime()
    cron_dow = (now.tm_wday + 1) % 7
    dt_tuple = (now.tm_min, now.tm_hour, now.tm_mday, now.tm_mon, cron_dow)

    for scheduled in all_tests:
        if not is_enabled(scheduled):
            continue
        cron_expr = scheduled.get("cronSchedule", "")
        if not cron_expr:
            continue
        if cron_matches(cron_expr, dt_tuple):
            try:
                _run_single_test(kv, session_key, scheduled)
            except Exception as exc:
                logger.error("Unhandled error running scheduled test %s: %s",
                             scheduled.get("id", ""), exc, exc_info=True)


def _extract_session_key(raw_input):
    # type: (str) -> str
    """Extract session_key from Splunk scripted input stdin."""
    raw = raw_input.strip()
    if not raw:
        return ""
    if raw.startswith("<"):
        import re
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(raw)
            elem = root.find(".//session_key")
            if elem is not None and elem.text:
                return elem.text.strip()
        except Exception:
            pass
        match = re.search(
            r"<session_key>\s*(.*?)\s*</session_key>", raw, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""
    return raw


if __name__ == "__main__":
    input_data = sys.stdin.read()
    _session_key = _extract_session_key(input_data)

    if not _session_key:
        logger.error("No session key found in scripted input stdin")
        sys.exit(1)

    run(_session_key)
