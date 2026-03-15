# -*- coding: utf-8 -*-
"""
alert_email.py — Email formatting and sending for scheduled test failures.
"""
from __future__ import annotations

import re
import smtplib
from email.mime.text import MIMEText
from typing import Any, Dict, List, Tuple

from config import SMTP_SERVER, SMTP_PORT, MAIL_FROM, DEFAULT_ALERT_EMAIL
from logger import get_logger

logger = get_logger(__name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_email(address):
    # type: (str) -> bool
    """Basic email format validation."""
    return bool(EMAIL_PATTERN.match(address.strip()))


def _format_failed_scenarios(scenario_results):
    # type: (List[Dict[str, Any]]) -> str
    """Format failed scenario names into a bullet list."""
    failed = [sr for sr in scenario_results if not sr.get("passed", True)]
    if not failed:
        return "  (none)"
    lines = []
    for scenario in failed:
        name = scenario.get("scenarioName", "Unknown")
        msg = scenario.get("message", "")
        line = "  - {0}".format(name)
        if msg:
            line += ": {0}".format(msg)
        lines.append(line)
    return "\n".join(lines)


def build_failure_email(test_name, ran_at, status, scenario_results,
                        spl_drift_detected):
    # type: (str, str, str, List[Dict[str, Any]], bool) -> Tuple[str, str]
    """Build subject and body for a failure notification email.

    Returns (subject, body) tuple.
    """
    subject = "[Query Tester] Test Failed: {0}".format(test_name)

    drift_line = ""
    if spl_drift_detected:
        drift_line = (
            "\nWARNING: SPL drift detected — the saved search SPL has "
            "changed since this test was created.\n"
        )

    body = (
        "Scheduled test '{test_name}' has {status}.\n"
        "\n"
        "Run time: {ran_at}\n"
        "Status:   {status}\n"
        "{drift}"
        "\n"
        "Failed scenarios:\n"
        "{failed}\n"
        "\n"
        "View details in the Query Tester app (Test Suites page).\n"
    ).format(
        test_name=test_name,
        status=status,
        ran_at=ran_at,
        drift=drift_line,
        failed=_format_failed_scenarios(scenario_results),
    )
    return subject, body


def send_failure_emails(recipients, test_name, ran_at, status,
                        scenario_results, spl_drift_detected):
    # type: (List[str], str, str, str, List[Dict[str, Any]], bool) -> None
    """Send failure notification to all valid recipients. Falls back to default."""
    if not recipients:
        recipients = [DEFAULT_ALERT_EMAIL]

    subject, body = build_failure_email(
        test_name, ran_at, status, scenario_results, spl_drift_detected,
    )

    for recipient in recipients:
        stripped = recipient.strip() if recipient else ""
        if not stripped:
            continue
        if not _is_valid_email(stripped):
            logger.warning("Skipping malformed email address: %s", stripped)
            continue

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = MAIL_FROM
        msg["To"] = stripped
        try:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.sendmail(MAIL_FROM, [stripped], msg.as_string())
            server.quit()
            logger.info("Failure email sent to %s for test '%s'", stripped, test_name)
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", stripped, exc)
