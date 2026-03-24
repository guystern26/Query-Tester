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
            web_url = cfg.get("splunk_web_url", SPLUNK_WEB_URL)
            # If web URL is still localhost default but a real host is
            # configured, build the URL from splunk_host automatically.
            splunk_host = cfg.get("splunk_host", "localhost")
            if "localhost" in web_url and splunk_host != "localhost":
                scheme = cfg.get("splunk_scheme", "https")
                web_url = "{0}://{1}:8000".format(scheme, splunk_host)
            return {
                "smtp_server": cfg.get("smtp_server", SMTP_SERVER),
                "smtp_port": port,
                "mail_from": cfg.get("mail_from", MAIL_FROM),
                "default_alert_email": cfg.get("default_alert_email", DEFAULT_ALERT_EMAIL),
                "splunk_web_url": web_url,
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
    splunk_web_url="",   # type: str
):
    # type: (...) -> Tuple[str, str]
    """Build subject and Outlook-compatible HTML body for a failure email.

    Uses table-based layout, no divs for structure, no border-radius,
    no flex, no CSS shorthand. Works in Outlook 2013+, OWA, Gmail, Apple Mail.
    Light neutral design for both light-mode and dark-mode Outlook.
    """
    subject = "[Query Tester] Test Failed: {0}".format(test_name)

    status_color = "#dc2626" if status in ("fail", "error") else "#d97706"
    status_label = status.upper()
    status_bg = "#fef2f2" if status in ("fail", "error") else "#fffbeb"

    # SPL drift warning
    drift_html = ""
    if spl_drift_detected:
        drift_html = (
            '<tr><td style="padding:0 0 12px">'
            '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
            '<tr bgcolor="#fffbeb">'
            '<td class="em-drift" style="padding:10px 14px;'
            'border-left:4px solid #d97706;font-size:13px;color:#92400e;'
            'font-family:Arial,sans-serif">'
            "&#9888; <strong>SPL drift detected</strong> &mdash; the saved "
            "search SPL has changed since this test was created."
            "</td></tr></table></td></tr>"
        )

    # CTA button — Outlook-compatible bulletproof button
    link_html = ""
    if test_id:
        url = _build_test_link(test_id, splunk_web_url or SPLUNK_WEB_URL)
        link_html = (
            '<tr><td style="padding:16px 0 0">'
            '<table cellpadding="0" cellspacing="0" border="0">'
            "<tr>"
            '<td bgcolor="#2563eb" style="padding:10px 24px">'
            '<a href="{url}" style="color:#ffffff;font-size:13px;'
            "font-weight:bold;text-decoration:none;"
            'font-family:Arial,sans-serif">'
            "Open Test in Query Tester</a>"
            "</td></tr></table></td></tr>"
        ).format(url=url)

    # Scenario blocks
    scenario_blocks = "\n".join(
        "<tr><td style=\"padding:0 0 4px\">"
        + format_scenario_block(s)
        + "</td></tr>"
        for s in scenario_results
    )

    # Summary line
    summary_html = ""
    if full_results:
        passed = full_results.get("passedScenarios", 0)
        total = full_results.get("totalScenarios", 0)
        msg = full_results.get("message", "")
        summary_html = (
            '<tr><td class="em-sub" style="padding:0 0 12px;font-size:13px;'
            'color:#6b7280;font-family:Arial,sans-serif">'
            "{passed}/{total} scenarios passed"
            "{msg}</td></tr>"
        ).format(
            passed=passed,
            total=total,
            msg=" &mdash; " + esc(msg) if msg else "",
        )

    # Dark-mode CSS — overrides inline light-mode styles for webmail clients
    # (Gmail, OWA, Apple Mail). Outlook desktop ignores <style> but auto-inverts
    # the light inline styles, which produces an acceptable dark result.
    dark_css = (
        "<style>"
        ":root{color-scheme:light dark;supported-color-schemes:light dark}"
        "@media(prefers-color-scheme:dark){"
        ".em-body{background-color:#1a1a2e!important}"
        ".em-card{background-color:#16213e!important}"
        ".em-head{color:#e2e8f0!important}"
        ".em-sub{color:#94a3b8!important}"
        ".em-text{color:#cbd5e1!important}"
        ".em-muted{color:#64748b!important}"
        ".em-border{border-color:#334155!important}"
        ".em-row-even{background-color:#16213e!important}"
        ".em-row-odd{background-color:#1a1a2e!important}"
        ".em-row-fail{background-color:#2d1b1b!important}"
        ".em-scen-head{background-color:#1e293b!important}"
        ".em-scen-border{border-color:#475569!important}"
        ".em-footer{background-color:#0f172a!important;color:#64748b!important;"
        "border-color:#334155!important}"
        ".em-drift{background-color:#422006!important;color:#fde68a!important;"
        "border-color:#a16207!important}"
        ".em-status-bg{background-color:transparent!important}"
        "}"
        # Outlook.com dark mode (uses data-ogsc / data-ogsb attributes)
        "[data-ogsc] .em-body{background-color:#1a1a2e!important}"
        "[data-ogsc] .em-card{background-color:#16213e!important}"
        "[data-ogsc] .em-head{color:#e2e8f0!important}"
        "[data-ogsc] .em-sub{color:#94a3b8!important}"
        "[data-ogsc] .em-text{color:#cbd5e1!important}"
        "[data-ogsc] .em-muted{color:#64748b!important}"
        "[data-ogsc] .em-footer{background-color:#0f172a!important;"
        "color:#64748b!important}"
        "[data-ogsc] .em-drift{background-color:#422006!important;"
        "color:#fde68a!important}"
        "</style>"
    )

    # Full email body — table-based layout with dual-mode classes
    body = (
        "<!DOCTYPE html>"
        '<html><head><meta charset="utf-8">'
        '<meta name="color-scheme" content="light dark">'
        '<meta name="supported-color-schemes" content="light dark">'
        "{dark_css}"
        "</head>"
        '<body class="em-body" style="margin:0;padding:0;'
        'background-color:#f3f4f6;font-family:Arial,sans-serif">'
        "<!--[if mso]>"
        '<table cellpadding="0" cellspacing="0" border="0" width="700"'
        ' align="center"><tr><td>'
        "<![endif]-->"
        '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
        ' style="max-width:700px;margin:0 auto">'
        # Top accent bar
        "<tr>"
        '<td bgcolor="#1e293b" style="padding:0;height:4px;font-size:0;'
        'line-height:0">&nbsp;</td>'
        "</tr>"
        # Header
        '<tr><td class="em-card" bgcolor="#ffffff"'
        ' style="padding:24px 24px 16px">'
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        '<tr><td class="em-head" style="font-size:22px;font-weight:bold;'
        'color:#1f2937;font-family:Arial,sans-serif">'
        "Test Failure Report</td></tr>"
        '<tr><td class="em-sub" style="padding:4px 0 0;font-size:14px;'
        'color:#6b7280;font-family:Arial,sans-serif">'
        "{test_name}</td></tr>"
        "</table></td></tr>"
        # Status + run time
        '<tr><td class="em-card" bgcolor="#ffffff"'
        ' style="padding:0 24px 16px">'
        '<table cellpadding="0" cellspacing="0" border="0">'
        "<tr>"
        '<td class="em-sub" style="padding:4px 0;font-size:13px;'
        'color:#6b7280;font-family:Arial,sans-serif;font-weight:bold">'
        "Status:</td>"
        '<td class="em-status-bg" bgcolor="{status_bg}"'
        ' style="padding:4px 12px;font-size:13px;color:{status_color};'
        'font-weight:bold;font-family:Arial,sans-serif">'
        "{status_label}</td>"
        "</tr>"
        "<tr>"
        '<td class="em-sub" style="padding:4px 0;font-size:13px;'
        'color:#6b7280;font-family:Arial,sans-serif;font-weight:bold">'
        "Run time:</td>"
        '<td class="em-text" style="padding:4px 12px;font-size:13px;'
        'color:#374151;font-family:Arial,sans-serif">{ran_at}</td>'
        "</tr>"
        "</table></td></tr>"
        # Drift warning
        "{drift_section}"
        # Scenarios heading + summary
        '<tr><td class="em-card" bgcolor="#ffffff" style="padding:0 24px">'
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        '<tr><td class="em-head em-border" style="padding:8px 0 12px;'
        'border-top:1px solid #e5e7eb;font-size:16px;font-weight:bold;'
        'color:#1f2937;font-family:Arial,sans-serif">'
        "Scenario Results</td></tr>"
        "{summary}"
        "</table></td></tr>"
        # Scenario blocks
        '<tr><td class="em-card" bgcolor="#ffffff"'
        ' style="padding:0 24px 16px">'
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        "{scenarios}"
        "</table></td></tr>"
        # CTA button
        '<tr><td class="em-card" bgcolor="#ffffff"'
        ' style="padding:0 24px 24px">'
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        "{link}"
        "</table></td></tr>"
        # Footer
        "<tr>"
        '<td class="em-footer" bgcolor="#f9fafb" style="padding:16px 24px;'
        'border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;'
        'font-family:Arial,sans-serif">'
        "This email was sent by the Query Tester scheduled runner. "
        "The test definition is attached as a JSON file."
        "</td></tr>"
        "</table>"
        "<!--[if mso]></td></tr></table><![endif]-->"
        "</body></html>"
    ).format(
        dark_css=dark_css,
        test_name=esc(test_name),
        status_color=status_color,
        status_bg=status_bg,
        status_label=status_label,
        ran_at=esc(ran_at),
        drift_section=(
            '<tr><td class="em-card" bgcolor="#ffffff"'
            ' style="padding:0 24px">'
            '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
            + drift_html
            + "</table></td></tr>"
            if drift_html else ""
        ),
        summary=summary_html,
        scenarios=scenario_blocks,
        link=link_html,
    )

    return subject, body


# ─── Attachment ──────────────────────────────────────────────────────────────


def _build_attachment(test_name, definition, full_results):
    # type: (str, Dict[str, Any], Optional[Dict[str, Any]]) -> MIMEBase
    # Match the app's import format (fileSlice.ts SavedState)
    # so the attachment can be loaded directly via the Import button.
    test_id = definition.get("id", "")
    payload = {
        "version": 2,
        "savedAt": full_results.get("timestamp", "") if full_results else "",
        "activeTestId": test_id,
        "testDefinition": [definition],
        "payload": [],
    }  # type: Dict[str, Any]
    if full_results:
        payload["testResults"] = full_results

    content = json.dumps(payload, indent=2, default=str)
    part = MIMEBase("application", "json")
    part.set_payload(content.encode("utf-8"))
    encoders.encode_base64(part)

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", test_name)[:60]
    filename = "splunk-query-tester-{0}.json".format(safe_name)
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

    # Deduplicate and validate recipients
    valid = []  # type: List[str]
    seen = set()  # type: set
    for r in recipients:
        addr = r.strip() if r else ""
        if not addr or addr.lower() in seen:
            continue
        if not _is_valid_email(addr):
            logger.warning("Skipping malformed email address: %s", addr)
            continue
        seen.add(addr.lower())
        valid.append(addr)

    if not valid:
        logger.warning("No valid recipients for test '%s'", test_name)
        return

    subject, html_body = build_failure_email(
        test_name, ran_at, status, scenario_results, spl_drift_detected,
        test_id=test_id, full_results=full_results,
        splunk_web_url=web_url,
    )

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = ", ".join(valid)
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    if definition:
        msg.attach(_build_attachment(test_name, definition, full_results))

    try:
        if tls_mode == "ssl":
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
            if tls_mode == "starttls":
                server.starttls()
        if auth_method == "password" and smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.sendmail(mail_from, valid, msg.as_string())
        server.quit()
        logger.info("Failure email sent to %s for test '%s'",
                    ", ".join(valid), test_name)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s",
                     ", ".join(valid), exc)
