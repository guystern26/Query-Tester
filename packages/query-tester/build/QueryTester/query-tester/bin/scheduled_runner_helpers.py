# -*- coding: utf-8 -*-
"""
scheduled_runner_helpers.py — Helper functions for scheduled_runner.py.
History record building, test payload construction, and summary generation.
"""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List

from logger import get_logger
from kvstore_client import KVStoreClient


logger = get_logger("scheduled_runner_helpers")

COLLECTION_RUN_HISTORY = "test_run_history"


def write_history_record(kv, test_id, ran_at, status, duration_ms,
                         summary, scenario_results, current_spl="",
                         spl_drift=False, spl_drift_details=""):
    # type: (KVStoreClient, str, str, str, int, str, List[Dict[str, Any]], str, bool, str) -> None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "scheduledTestId": test_id,
            "ranAt": ran_at,
            "status": status,
            "durationMs": duration_ms,
            "splSnapshot": current_spl,
            "splSnapshotHash": "",
            "splDriftDetected": spl_drift,
            "splDriftDetails": spl_drift_details,
            "resultSummary": summary,
            "scenarioResults": json.dumps(scenario_results),
        }
        kv.upsert(COLLECTION_RUN_HISTORY, record["id"], record)
    except Exception as exc:
        logger.error("Failed to write history record for %s: %s", test_id, exc)


def build_scenario_results(result):
    # type: (Dict[str, Any]) -> List[Dict[str, Any]]
    """Extract human-readable scenario results from a TestRunner response."""
    scenario_results = []  # type: List[Dict[str, Any]]
    for scenario in result.get("scenarioResults", []):
        msg = scenario.get("error", "")
        if not msg:
            validations = scenario.get("validations", [])
            parts = []
            for validation in validations:
                validation_msg = validation.get("message", "")
                if validation_msg:
                    parts.append(validation_msg)
            msg = "; ".join(parts) if parts else (
                "All validations passed" if scenario.get("passed") else "No details"
            )
        scenario_results.append({
            "scenarioId": scenario.get("scenarioId", ""),
            "scenarioName": scenario.get("scenarioName", ""),
            "passed": scenario.get("passed", False),
            "message": msg,
        })
    return scenario_results


def build_summary(passed, total, scenario_results):
    # type: (int, int, List[Dict[str, Any]]) -> str
    first_failure = ""
    for sr in scenario_results:
        if not sr.get("passed") and sr.get("message"):
            first_failure = sr["message"]
            break
    if first_failure:
        return "Passed {0}/{1}: {2}".format(passed, total, first_failure)
    return "Passed {0}/{1}".format(passed, total)


def build_test_payload(definition, saved_test, scheduled):
    # type: (Dict[str, Any], Dict[str, Any], Dict[str, Any]) -> tuple
    """Build the payload dict and extract query SPL from a saved test definition."""
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
        "testName": definition.get("name", saved_test.get(
            "name", scheduled.get("testName", ""))),
        "app": definition.get("app", saved_test.get("app", "search")),
        "testType": definition.get("testType", "standard"),
        "query": query_spl,
        "earliestTime": earliest,
        "latestTime": latest,
        "scenarios": definition.get("scenarios", []),
        "validation": definition.get("validation", {}),
    }
    return payload, query_spl
