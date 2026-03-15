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
import uuid
from typing import Any, Dict, List, Optional

_bin_dir = os.path.dirname(os.path.abspath(__file__))
if _bin_dir not in sys.path:
    sys.path.insert(0, _bin_dir)

from logger import get_logger
from kvstore_client import KVStoreClient

logger = get_logger("scheduled_runner")

COLLECTION_SCHEDULED_TESTS = "scheduled_tests"
COLLECTION_RUN_HISTORY = "test_run_history"
COLLECTION_SAVED_TESTS = "saved_tests"


def _cron_matches(cron_expr, dt_tuple):
    # type: (str, tuple) -> bool
    """Check if a 5-field cron expression matches the given (min, hour, dom, month, dow)."""
    parts = cron_expr.strip().split()
    if len(parts) < 5:
        return False

    fields = [
        (parts[0], dt_tuple[0], 0, 59),     # minute
        (parts[1], dt_tuple[1], 0, 23),     # hour
        (parts[2], dt_tuple[2], 1, 31),     # day of month
        (parts[3], dt_tuple[3], 1, 12),     # month
        (parts[4], dt_tuple[4], 0, 6),      # day of week (0=Sunday in cron)
    ]

    for field, current, low, high in fields:
        if not _field_matches(field, current, low, high):
            return False
    return True


def _field_matches(field, current, low, high):
    # type: (str, int, int, int) -> bool
    """Check if a single cron field matches the current value."""
    if field == "*":
        return True

    for part in field.split(","):
        if "/" in part:
            base, step_str = part.split("/", 1)
            try:
                step = int(step_str)
            except ValueError:
                continue
            if base == "*":
                if current % step == 0:
                    return True
            elif "-" in base:
                rng = base.split("-", 1)
                try:
                    rng_low, rng_high = int(rng[0]), int(rng[1])
                    if rng_low <= current <= rng_high and (current - rng_low) % step == 0:
                        return True
                except ValueError:
                    continue
        elif "-" in part:
            rng = part.split("-", 1)
            try:
                rng_low, rng_high = int(rng[0]), int(rng[1])
                if rng_low <= current <= rng_high:
                    return True
            except ValueError:
                continue
        else:
            try:
                if int(part) == current:
                    return True
            except ValueError:
                continue

    return False


def _is_enabled(record):
    # type: (Dict[str, Any]) -> bool
    val = record.get("enabled", True)
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("1", "true", "yes")
    return bool(val)


def _write_history_record(kv, test_id, ran_at, status, duration_ms,
                          summary, scenario_results):
    # type: (KVStoreClient, str, str, str, int, str, List[Dict[str, Any]]) -> None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "scheduledTestId": test_id,
            "ranAt": ran_at,
            "status": status,
            "durationMs": duration_ms,
            "splSnapshotHash": "",
            "splDriftDetected": False,
            "resultSummary": summary,
            "scenarioResults": json.dumps(scenario_results),
        }
        kv.upsert(COLLECTION_RUN_HISTORY, record["id"], record)
    except Exception as exc:
        logger.error("Failed to write history record for %s: %s", test_id, exc)


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

    try:
        # Fetch saved test definition from KVStore
        try:
            saved_test = kv.get_by_id(COLLECTION_SAVED_TESTS, test_id)
        except Exception:
            logger.error("Saved test %s not found for scheduled test %s", test_id, sched_id)
            return

        # The definition is stored as a JSON string in KVStore
        definition = saved_test.get("definition", {})
        if isinstance(definition, str):
            definition = json.loads(definition)

        # Transform saved definition into the payload format TestRunner expects.
        # The frontend sends a flat payload with testName, app, query (string),
        # earliestTime, latestTime, scenarios[], validation{}.
        query_obj = definition.get("query", {})
        if isinstance(query_obj, str):
            query_spl = query_obj
            earliest = "-24h"
            latest = "now"
        else:
            query_spl = query_obj.get("spl", "")
            time_range = query_obj.get("timeRange", {})
            earliest = time_range.get("earliest", "-24h")
            latest = time_range.get("latest", "now")

        payload = {
            "testName": definition.get("name", saved_test.get("name", scheduled.get("testName", ""))),
            "app": definition.get("app", saved_test.get("app", "search")),
            "testType": definition.get("testType", "standard"),
            "query": query_spl,
            "earliestTime": earliest,
            "latestTime": latest,
            "scenarios": definition.get("scenarios", []),
            "validation": definition.get("validation", {}),
        }

        from core.test_runner import TestRunner
        runner = TestRunner(session_key)
        result, _ = runner.run_test(payload)
        raw_status = result.get("status", "error")
        status = raw_status if raw_status in ("pass", "fail", "partial") else "error"

        for scenario in result.get("scenarioResults", []):
            # Build a human-readable message from validations
            msg = scenario.get("error", "")
            if not msg:
                validations = scenario.get("validations", [])
                parts = []
                for v in validations:
                    m = v.get("message", "")
                    if m:
                        parts.append(m)
                msg = "; ".join(parts) if parts else (
                    "All validations passed" if scenario.get("passed") else "No details"
                )
            scenario_results.append({
                "scenarioId": scenario.get("scenarioId", ""),
                "scenarioName": scenario.get("scenarioName", ""),
                "passed": scenario.get("passed", False),
                "message": msg,
            })
    except Exception as exc:
        logger.error("Test execution failed for %s: %s", sched_id, exc, exc_info=True)

    duration_ms = int(time.time() * 1000) - start_ms
    ran_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    passed = result.get("passedScenarios", 0)
    total = result.get("totalScenarios", 0)

    # Build summary with first failure reason
    first_failure = ""
    for sr in scenario_results:
        if not sr.get("passed") and sr.get("message"):
            first_failure = sr["message"]
            break
    if first_failure:
        summary = "Passed {0}/{1}: {2}".format(passed, total, first_failure)
    else:
        summary = "Passed {0}/{1}".format(passed, total)

    _write_history_record(kv, sched_id, ran_at, status, duration_ms, summary, scenario_results)

    # Update scheduled test with last run info
    try:
        scheduled["lastRunAt"] = ran_at
        scheduled["lastRunStatus"] = status
        kv.upsert(COLLECTION_SCHEDULED_TESTS, sched_id, scheduled)
    except Exception as exc:
        logger.error("Failed to update scheduled test %s: %s", sched_id, exc)

    logger.info("Scheduled test %s completed: status=%s, duration=%dms", sched_id, status, duration_ms)

    # Send failure emails if configured
    if status in ("fail", "error") and scheduled.get("alertOnFailure"):
        try:
            from alert_email import send_failure_emails
            recipients = scheduled.get("emailRecipients", [])
            send_failure_emails(
                recipients,
                scheduled.get("testName", sched_id),
                ran_at, status, scenario_results, False,
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

    # Get current time components for cron matching
    # Use local time for cron matching (standard cron behavior)
    now = time.localtime()
    # Convert to Python's weekday (0=Mon) to cron weekday (0=Sun)
    cron_dow = (now.tm_wday + 1) % 7
    dt_tuple = (now.tm_min, now.tm_hour, now.tm_mday, now.tm_mon, cron_dow)

    for scheduled in all_tests:
        if not _is_enabled(scheduled):
            continue

        cron_expr = scheduled.get("cronSchedule", "")
        if not cron_expr:
            continue

        if _cron_matches(cron_expr, dt_tuple):
            try:
                _run_single_test(kv, session_key, scheduled)
            except Exception as exc:
                logger.error("Unhandled error running scheduled test %s: %s",
                             scheduled.get("id", ""), exc, exc_info=True)


def _extract_session_key(raw_input):
    # type: (str) -> str
    """Extract session_key from Splunk scripted input stdin.

    With passAuth, Splunk sends the raw session key directly (no XML).
    With modular inputs, Splunk sends XML with <session_key> element.
    Handle both.
    """
    raw = raw_input.strip()
    if not raw:
        return ""

    # If it looks like XML, parse it
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
        # Regex fallback for malformed XML
        match = re.search(r"<session_key>\s*(.*?)\s*</session_key>", raw, re.DOTALL)
        if match:
            return match.group(1).strip()
        return ""

    # Raw session key (passAuth mode)
    return raw


if __name__ == "__main__":
    input_data = sys.stdin.read()
    _session_key = _extract_session_key(input_data)

    if not _session_key:
        logger.error("No session key found in scripted input stdin")
        sys.exit(1)

    run(_session_key)
