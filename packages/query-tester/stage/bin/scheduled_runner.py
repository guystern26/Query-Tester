# -*- coding: utf-8 -*-
"""
scheduled_runner.py — Scripted input that runs scheduled tests on their cron.

Runs every 60 seconds via inputs.conf. Uses a KVStore-backed queue so tests
that can't run immediately (pool full) persist until the next cycle instead
of being silently skipped.

Two-phase approach:
  Phase 1 — Enqueue: check cron matches, mark due tests as 'queued'.
  Phase 2 — Process: pick up to max_parallel_tests queued tests, run them.

Queue states on each scheduled_tests record:
  idle    — not running, waiting for next cron match
  queued  — due to run, waiting for a worker slot
  running — currently executing
"""
from __future__ import annotations

import json
import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
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
TEST_TIMEOUT_SECONDS = 300    # 5 min max per individual test
DEDUP_WINDOW_SECONDS = 120    # skip if ran in last 2 min
STALE_RUNNING_SECONDS = 600   # reset 'running' after 10 min (crashed/timed-out worker)

# Lock for KVStore writes to scheduled_tests (concurrent workers)
_kv_lock = threading.Lock()


# ── Helpers ─────────────────────────────────────────────────────────

def _parse_iso(iso_str):
    # type: (str) -> float
    """Parse ISO timestamp to epoch seconds. Returns 0 on failure."""
    if not iso_str:
        return 0.0
    try:
        return time.mktime(time.strptime(iso_str, "%Y-%m-%dT%H:%M:%SZ"))
    except (ValueError, OverflowError):
        return 0.0


def _now_iso():
    # type: () -> str
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _ran_recently(record):
    # type: (Dict[str, Any]) -> bool
    """O(1) dedup: check lastRunAt on the record itself."""
    last = record.get("lastRunAt", "")
    if not last:
        return False
    return (time.time() - _parse_iso(last)) < DEDUP_WINDOW_SECONDS


def _update_record(kv, sched_id, updates):
    # type: (KVStoreClient, str, Dict[str, Any]) -> None
    """Thread-safe read-modify-write on a scheduled_tests record."""
    with _kv_lock:
        try:
            fresh = kv.get_by_id(COLLECTION_SCHEDULED_TESTS, sched_id)
            fresh.update(updates)
            kv.upsert(COLLECTION_SCHEDULED_TESTS, sched_id, fresh)
        except Exception as exc:
            logger.error("Failed to update scheduled test %s: %s", sched_id, exc)


def _get_max_workers(session_key):
    # type: (str) -> int
    """Read max_parallel_tests from runtime config, clamped to 1-10."""
    try:
        from runtime_config import get_runtime_config
        cfg = get_runtime_config(session_key)
        val = int(cfg.get("max_parallel_tests", 5))
        return max(1, min(10, val))
    except Exception:
        return 5


# ── Phase 1: Enqueue ───────────────────────────────────────────────

def _enqueue_due_tests(kv, all_tests):
    # type: (KVStoreClient, List[Dict[str, Any]]) -> int
    """Mark cron-matched tests as 'queued'. Returns count enqueued."""
    now_local = time.localtime()
    cron_dow = (now_local.tm_wday + 1) % 7
    dt_tuple = (now_local.tm_min, now_local.tm_hour,
                now_local.tm_mday, now_local.tm_mon, cron_dow)
    now_ts = time.time()
    enqueued = 0

    for rec in all_tests:
        if not is_enabled(rec):
            continue
        sched_id = rec.get("id", "")
        queue_status = rec.get("queueStatus", "idle")

        # Reset stale 'running' tests (crashed worker)
        if queue_status == "running":
            queued_at = _parse_iso(rec.get("queuedAt", ""))
            if queued_at and (now_ts - queued_at) > STALE_RUNNING_SECONDS:
                logger.warning("Resetting stale running test %s to idle.", sched_id)
                _update_record(kv, sched_id, {"queueStatus": "idle", "queuedAt": ""})
                queue_status = "idle"
            else:
                continue  # still running, leave it

        # Already queued — leave it
        if queue_status == "queued":
            continue

        # Check cron match
        cron_expr = rec.get("cronSchedule", "")
        if not cron_expr or not cron_matches(cron_expr, dt_tuple):
            continue

        # O(1) dedup: skip if lastRunAt is within 2 minutes
        if _ran_recently(rec):
            logger.info("Skipping %s — ran recently (dedup).", sched_id)
            continue

        # Enqueue
        _update_record(kv, sched_id, {
            "queueStatus": "queued",
            "queuedAt": _now_iso(),
        })
        enqueued += 1
        logger.info("Enqueued test %s", sched_id)

    return enqueued


# ── Phase 2: Process ───────────────────────────────────────────────

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
    ran_at = _now_iso()
    passed = result.get("passedScenarios", 0)
    total = result.get("totalScenarios", 0)
    summary = build_summary(passed, total, scenario_results)

    # SPL drift detection
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

    # Mark done: update lastRun + reset queue status to idle
    _update_record(kv, sched_id, {
        "lastRunAt": ran_at,
        "lastRunStatus": status,
        "queueStatus": "idle",
        "queuedAt": "",
    })

    logger.info("Scheduled test %s completed: status=%s, duration=%dms",
                sched_id, status, duration_ms)

    # Send failure emails
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


def _process_queue(kv, session_key, all_tests, max_workers):
    # type: (KVStoreClient, str, List[Dict[str, Any]], int) -> None
    """Pick queued tests and run them in a thread pool."""
    # Re-fetch to see freshly-queued records
    try:
        all_tests = kv.get_all(COLLECTION_SCHEDULED_TESTS)
    except Exception as exc:
        logger.error("Failed to re-fetch scheduled tests: %s", exc)
        return

    queued = []  # type: List[Dict[str, Any]]
    for rec in all_tests:
        if rec.get("queueStatus") == "queued":
            queued.append(rec)

    if not queued:
        return

    # Sort by queuedAt so oldest-queued runs first
    queued.sort(key=lambda r: r.get("queuedAt", ""))

    # Take up to max_workers
    batch = queued[:max_workers]
    overflow = len(queued) - len(batch)
    if overflow > 0:
        logger.info("%d queued test(s) will wait for the next cycle.", overflow)

    logger.info("Processing %d queued test(s) with max_workers=%d",
                len(batch), max_workers)

    # Mark batch as 'running' before submitting
    for rec in batch:
        _update_record(kv, rec["id"], {"queueStatus": "running"})

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {}  # type: Dict[Any, str]
        for rec in batch:
            worker_kv = KVStoreClient(session_key)
            future = pool.submit(_run_single_test, worker_kv, session_key, rec)
            futures[future] = rec.get("id", "unknown")

        for future in as_completed(futures):
            sched_id = futures[future]
            try:
                future.result(timeout=TEST_TIMEOUT_SECONDS)
            except Exception as exc:
                if "TimeoutError" in type(exc).__name__:
                    logger.error("Test %s timed out after %ds",
                                 sched_id, TEST_TIMEOUT_SECONDS)
                else:
                    logger.error("Unhandled error running scheduled test %s: %s",
                                 sched_id, exc, exc_info=True)
                # Reset to idle so it can be retried next cycle
                _update_record(kv, sched_id, {
                    "queueStatus": "idle", "queuedAt": "",
                })


# ── Main entry point ───────────────────────────────────────────────

def run(session_key):
    # type: (str) -> None
    """Main entry point called every 60 seconds by inputs.conf."""
    try:
        kv = KVStoreClient(session_key)
        all_tests = kv.get_all(COLLECTION_SCHEDULED_TESTS)
    except Exception as exc:
        logger.error("Failed to fetch scheduled tests: %s", exc)
        return

    if not all_tests:
        return

    # Phase 1: enqueue due tests (fast — just KVStore writes)
    _enqueue_due_tests(kv, all_tests)

    # Phase 2: process queued tests (slow — runs actual tests)
    max_workers = _get_max_workers(session_key)
    _process_queue(kv, session_key, all_tests, max_workers)


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
