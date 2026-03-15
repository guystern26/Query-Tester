# -*- coding: utf-8 -*-
"""
alert_helpers.py — Shared helpers for alert action: email, hashing, summaries.
"""
from __future__ import annotations

import hashlib
import json
import smtplib
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

from config import SMTP_SERVER, SMTP_PORT, MAIL_FROM
from logger import get_logger

logger = get_logger(__name__)


def compute_spl_hash(spl):
    # type: (str) -> str
    """Return a short MD5 hash of the SPL string."""
    return hashlib.md5(spl.encode("utf-8")).hexdigest()[:12]


def get_current_spl(service, saved_search_name):
    # type: (Any, str) -> Optional[str]
    """Fetch current SPL from a Splunk saved search. Returns None if not found."""
    try:
        ss = service.saved_searches[saved_search_name]
        return ss["search"]
    except (KeyError, Exception) as exc:
        logger.warning("Could not fetch saved search %s: %s", saved_search_name, exc)
        return None


def build_result_summary(result):
    # type: (Dict[str, Any]) -> str
    """Build a human-readable summary from the test result."""
    status = result.get("status", "error")
    passed = result.get("passedScenarios", 0)
    total = result.get("totalScenarios", 0)
    return "Status: {0}, Passed: {1}/{2}".format(status, passed, total)


def extract_scenario_results(result):
    # type: (Dict[str, Any]) -> List[Dict[str, Any]]
    """Extract scenario results for the history record."""
    scenario_results = []
    for sr in result.get("scenarioResults", []):
        scenario_results.append({
            "scenarioId": sr.get("scenarioId", ""),
            "scenarioName": sr.get("scenarioName", ""),
            "passed": sr.get("passed", False),
            "message": sr.get("message", ""),
        })
    return scenario_results


def send_failure_email(recipient, test_name, result_summary):
    # type: (str, str, str) -> None
    """Send a failure notification email via SMTP."""
    subject = "Scheduled Test Failed: {0}".format(test_name)
    body = (
        "Scheduled test '{0}' has failed.\n\n"
        "Summary:\n{1}\n\n"
        "Check the Query Tester app for details."
    ).format(test_name, result_summary)

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = MAIL_FROM
    msg["To"] = recipient

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.sendmail(MAIL_FROM, [recipient], msg.as_string())
        server.quit()
        logger.info("Failure email sent to %s", recipient)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", recipient, exc)
