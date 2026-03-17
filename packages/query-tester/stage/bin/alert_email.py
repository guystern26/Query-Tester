# -*- coding: utf-8 -*-
"""
alert_email.py — Email building and sending for scheduled test failures.

HTML rendering of scenario blocks and result row tables lives in
alert_email_html.py. This module handles the top-level email structure,
JSON attachment, and SMTP delivery.
"""
from __future__ import annotations

import json
import re
import smtplib
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders
from typing import Any, Dict, List, Optional, Tuple

from config import (
    SMTP_SERVER, SMTP_PORT, MAIL_FROM, DEFAULT_ALERT_EMAIL, SPLUNK_WEB_URL,
)
from logger import get_logger
from alert_email_html import esc, format_scenario_block

logger = get_logger(__name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
APP_ROUTE = "/app/QueryTester/QueryTesterApp"


def _infer_tls_mode(tls_mode, smtp_port, auth_method):
    # type: (str, int, str) -> str
    """Auto-detect TLS mode from port when not explicitly configured."""
    if tls_mode:
        return tls_mode
    if auth_method in ("password", "oauth2"):
        if smtp_port == 465:
            return "ssl"
        if smtp_port == 587:
            return "starttls"
    return ""


def _get_email_config(session_key=None):
    # type: (Optional[str]) -> Dict[str, Any]
    """Get email config from runtime config (KVStore) or fall back to config.py."""
    if session_key:
        try:
            from runtime_config import get_runtime_config
            cfg = get_runtime_config(session_key)
            port = int(cfg.get("smtp_port", SMTP_PORT))
            auth = cfg.get("email_auth_method", "none")
            tls = _infer_tls_mode(cfg.get("tls_mode", ""), port, auth)
            return {
                "smtp_server": cfg.get("smtp_server", SMTP_SERVER),
                "smtp_port": port,
                "mail_from": cfg.get("mail_from", MAIL_FROM),
                "default_alert_email": cfg.get("default_alert_email", DEFAULT_ALERT_EMAIL),
                "splunk_web_url": cfg.get("splunk_web_url", SPLUNK_WEB_URL),
                "smtp_password": cfg.get("smtp_password", ""),
                "smtp_username": cfg.get("smtp_username", ""),
                "email_auth_method": auth,
                "tls_mode": tls,
            }
        except Exception as exc:
            logger.warning("Runtime config unavailable, using static config: %s", exc)
    logger.info("Using static SMTP config: server=%s port=%s", SMTP_SERVER, SMTP_PORT)
    return {
        "smtp_server": SMTP_SERVER,
        "smtp_port": SMTP_PORT,
        "mail_from": MAIL_FROM,
        "default_alert_email": DEFAULT_ALERT_EMAIL,
        "splunk_web_url": SPLUNK_WEB_URL,
        "smtp_password": "",
        "smtp_username": "",
        "email_auth_method": "none",
        "tls_mode": "",
    }


def _is_valid_email(address):
    # type: (str) -> bool
    return bool(EMAIL_PATTERN.match(address.strip()))


def _build_test_link(test_id, splunk_web_url=SPLUNK_WEB_URL):
    # type: (str, str) -> str
    return "{base}{route}?test_id={tid}".format(
        base=splunk_web_url.rstrip("/"),
        route=APP_ROUTE,
        tid=test_id,
    )


# ─── Email body ─────────────────────────────────────────────────────────────


def build_failure_email(
    test_name,           # type: str
    ran_at,              # type: str
    status,              # type: str
    scenario_results,    # type: List[Dict[str, Any]]
    spl_drift_detected,  # type: bool
    test_id="",          # type: str
    full_results=None,   # type: Optional[Dict[str, Any]]
):
    # type: (...) -> Tuple[str, str]
    """Build subject and HTML body for a failure notification email."""
    subject = "[Query Tester] Test Failed: {0}".format(test_name)

    status_color = "#f87171" if status in ("fail", "error") else "#fbbf24"
    status_label = status.upper()

    drift_html = ""
    if spl_drift_detected:
        drift_html = (
            '<div style="margin:12px 0;padding:8px 12px;background:#78350f;'
            'border:1px solid #a16207;border-radius:6px;color:#fde68a;'
            'font-size:13px">'
            "&#9888; SPL drift detected &mdash; the saved search SPL has "
            "changed since this test was created."
            "</div>"
        )

    link_html = ""
    if test_id:
        url = _build_test_link(test_id)
        link_html = (
            '<a href="{url}" style="display:inline-block;margin-top:16px;'
            "padding:8px 20px;background:#2563eb;color:#fff;text-decoration:none;"
            'border-radius:6px;font-size:13px;font-weight:600">'
            "Open Test in Query Tester</a>".format(url=url)
        )

    scenario_blocks = "\n".join(
        format_scenario_block(s) for s in scenario_results
    )

    summary_html = ""
    if full_results:
        passed = full_results.get("passedScenarios", 0)
        total = full_results.get("totalScenarios", 0)
        msg = full_results.get("message", "")
        summary_html = (
            '<div style="margin-bottom:12px;color:#94a3b8;font-size:13px">'
            "{passed}/{total} scenarios passed"
            "{msg}</div>"
        ).format(
            passed=passed,
            total=total,
            msg=" &mdash; " + esc(msg) if msg else "",
        )

    body = (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,'
        "Roboto,sans-serif;max-width:700px;margin:0 auto;background:#0f172a;"
        'color:#e2e8f0;padding:24px;border-radius:12px">'
        '<h2 style="margin:0 0 4px;color:#f1f5f9">Test Failure Report</h2>'
        '<div style="margin-bottom:16px;font-size:14px;color:#94a3b8">'
        "{test_name}</div>"
        '<table style="margin-bottom:16px;font-size:13px;color:#cbd5e1">'
        "<tr><td><strong>Status:</strong></td>"
        '<td style="padding-left:12px;color:{status_color};font-weight:700">'
        "{status_label}</td></tr>"
        "<tr><td><strong>Run time:</strong></td>"
        '<td style="padding-left:12px">{ran_at}</td></tr>'
        "</table>"
        "{drift}"
        "{summary}"
        '<h3 style="margin:20px 0 12px;color:#f1f5f9;font-size:15px">'
        "Scenario Results</h3>"
        "{scenarios}"
        "{link}"
        '<div style="margin-top:20px;padding-top:12px;border-top:1px solid '
        '#334155;font-size:11px;color:#64748b">'
        "This email was sent by the Query Tester scheduled runner. "
        "The test definition is attached as a JSON file."
        "</div>"
        "</div>"
    ).format(
        test_name=esc(test_name),
        status_color=status_color,
        status_label=status_label,
        ran_at=esc(ran_at),
        drift=drift_html,
        summary=summary_html,
        scenarios=scenario_blocks,
        link=link_html,
    )

    return subject, body


# ─── Attachment ──────────────────────────────────────────────────────────────


def _build_attachment(test_name, definition, full_results):
    # type: (str, Dict[str, Any], Optional[Dict[str, Any]]) -> MIMEBase
    payload = {
        "testDefinition": definition,
    }
    if full_results:
        payload["testResults"] = full_results

    content = json.dumps(payload, indent=2, default=str)
    part = MIMEBase("application", "json")
    part.set_payload(content.encode("utf-8"))
    encoders.encode_base64(part)

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", test_name)[:60]
    filename = "{0}_results.json".format(safe_name)
    part.add_header("Content-Disposition", "attachment", filename=filename)
    return part


# ─── Send ────────────────────────────────────────────────────────────────────


def send_failure_emails(
    recipients,          # type: List[str]
    test_name,           # type: str
    ran_at,              # type: str
    status,              # type: str
    scenario_results,    # type: List[Dict[str, Any]]
    spl_drift_detected,  # type: bool
    test_id="",          # type: str
    definition=None,     # type: Optional[Dict[str, Any]]
    full_results=None,   # type: Optional[Dict[str, Any]]
    session_key=None,    # type: Optional[str]
):
    # type: (...) -> None
    """Send failure notification to all valid recipients. Falls back to default."""
    email_cfg = _get_email_config(session_key)
    smtp_server = email_cfg["smtp_server"]
    smtp_port = int(email_cfg["smtp_port"])
    mail_from = email_cfg["mail_from"]
    default_email = email_cfg["default_alert_email"]
    smtp_password = email_cfg.get("smtp_password", "")
    smtp_username = email_cfg.get("smtp_username", "")
    auth_method = email_cfg.get("email_auth_method", "none")
    tls_mode = email_cfg.get("tls_mode", "")
    web_url = email_cfg.get("splunk_web_url", SPLUNK_WEB_URL)

    logger.info("Email config: server=%s port=%s auth=%s tls=%s from=%s",
                smtp_server, smtp_port, auth_method, tls_mode, mail_from)

    if not recipients:
        recipients = [default_email]

    subject, html_body = build_failure_email(
        test_name, ran_at, status, scenario_results, spl_drift_detected,
        test_id=test_id, full_results=full_results,
    )

    for recipient in recipients:
        stripped = recipient.strip() if recipient else ""
        if not stripped:
            continue
        if not _is_valid_email(stripped):
            logger.warning("Skipping malformed email address: %s", stripped)
            continue

        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = mail_from
        msg["To"] = stripped

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if definition:
            msg.attach(_build_attachment(
                test_name, definition, full_results,
            ))

        try:
            if tls_mode == "ssl":
                server = smtplib.SMTP_SSL(smtp_server, smtp_port)
            else:
                server = smtplib.SMTP(smtp_server, smtp_port)
                if tls_mode == "starttls":
                    server.starttls()
            if auth_method == "password" and smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.sendmail(mail_from, [stripped], msg.as_string())
            server.quit()
            logger.info("Failure email sent to %s for test '%s'",
                        stripped, test_name)
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", stripped, exc)
