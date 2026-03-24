# -*- coding: utf-8 -*-
"""
bug_report_handler.py — Send bug report / feature request emails via SMTP.
Receives the report from the frontend and emails it with the test JSON attached.
"""
from __future__ import annotations

import json
import re
import smtplib
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders
from typing import Any, Dict, Optional

from config import (
    SMTP_SERVER, SMTP_PORT, MAIL_FROM, DEFAULT_ALERT_EMAIL, SPLUNK_WEB_URL,
)
from logger import get_logger

logger = get_logger(__name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _get_email_config(session_key=None):
    # type: (Optional[str]) -> Dict[str, Any]
    """Get email config from runtime config or fall back to config.py."""
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
                "default_alert_email": cfg.get(
                    "default_alert_email", DEFAULT_ALERT_EMAIL,
                ),
                "smtp_password": cfg.get("smtp_password", ""),
                "smtp_username": cfg.get("smtp_username", ""),
                "email_auth_method": auth,
                "tls_mode": tls,
            }
        except Exception as exc:
            logger.warning(
                "Runtime config unavailable, using static config: %s", exc,
            )
    return {
        "smtp_server": SMTP_SERVER,
        "smtp_port": SMTP_PORT,
        "mail_from": MAIL_FROM,
        "default_alert_email": DEFAULT_ALERT_EMAIL,
        "smtp_password": "",
        "smtp_username": "",
        "email_auth_method": "none",
        "tls_mode": "",
    }


def _infer_tls_mode(stored, port, auth):
    # type: (str, int, str) -> str
    if stored:
        return stored
    if auth in ("password", "oauth2", "apikey"):
        if port == 587:
            return "starttls"
        if port == 465:
            return "ssl"
    return ""


def _build_attachment(payload):
    # type: (Dict[str, Any]) -> MIMEBase
    """Wrap payload in the app's import format so it can be loaded via Import."""
    tests = payload.get("allTests") or []
    current = payload.get("currentTest")
    if current and current not in tests:
        tests = [current] + tests
    active_id = current.get("id", "") if current else ""
    if not active_id and tests:
        active_id = tests[0].get("id", "")
    importable = {
        "version": 2, "savedAt": payload.get("reportGeneratedAt", ""),
        "activeTestId": active_id,
        "testDefinition": tests, "payload": [],
    }  # type: Dict[str, Any]
    if payload.get("testResponse"):
        importable["testResults"] = payload["testResponse"]
    content = json.dumps(importable, indent=2, default=str)
    part = MIMEBase("application", "json")
    part.set_payload(content.encode("utf-8"))
    encoders.encode_base64(part)
    name = current.get("name", "") if current else ""
    if not name:
        name = "report"
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)[:60]
    part.add_header("Content-Disposition", "attachment",
                    filename="splunk-query-tester-{0}.json".format(safe))
    return part


def _build_html(report_type, description, username):
    # type: (str, str, str) -> str
    """Outlook-compatible table-based HTML for bug report emails."""
    label = "Bug Report" if report_type == "bug" else "Feature Request"
    color = "#dc2626" if report_type == "bug" else "#2563eb"
    accent_bg = "#fef2f2" if report_type == "bug" else "#eff6ff"
    return (
        "<!DOCTYPE html>"
        '<html><head><meta charset="utf-8">'
        '<meta name="color-scheme" content="light dark">'
        "</head><body style=\"margin:0;padding:0;background-color:#f3f4f6;"
        'font-family:Arial,sans-serif">'
        "<!--[if mso]>"
        '<table cellpadding="0" cellspacing="0" border="0" width="600"'
        ' align="center"><tr><td>'
        "<![endif]-->"
        '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
        ' style="max-width:600px;margin:0 auto">'
        # Accent bar
        '<tr><td bgcolor="{color}" style="padding:0;height:4px;font-size:0;'
        'line-height:0">&nbsp;</td></tr>'
        # Header
        '<tr bgcolor="#ffffff"><td style="padding:24px 24px 16px">'
        '<table cellpadding="0" cellspacing="0" border="0"><tr>'
        '<td bgcolor="{accent_bg}" style="padding:4px 12px;font-size:11px;'
        'font-weight:bold;color:{color};font-family:Arial,sans-serif;'
        'letter-spacing:0.5px">{label}</td>'
        "</tr></table>"
        '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
        ' style="margin-top:12px">'
        '<tr><td style="font-size:20px;font-weight:bold;color:#1f2937;'
        'font-family:Arial,sans-serif">Query Tester {label}</td></tr>'
        "</table></td></tr>"
        # Info rows
        '<tr bgcolor="#ffffff"><td style="padding:0 24px 16px">'
        '<table cellpadding="0" cellspacing="0" border="0">'
        "<tr>"
        '<td style="padding:4px 0;font-size:13px;color:#6b7280;'
        'font-weight:bold;font-family:Arial,sans-serif;width:100px">'
        "Reported by:</td>"
        '<td style="padding:4px 12px;font-size:13px;color:#374151;'
        'font-family:Arial,sans-serif">{user}</td>'
        "</tr></table></td></tr>"
        # Description
        '<tr bgcolor="#ffffff"><td style="padding:0 24px 24px">'
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        '<tr><td style="padding:0 0 6px;font-size:12px;font-weight:bold;'
        'color:#6b7280;font-family:Arial,sans-serif">Description</td></tr>'
        '<tr><td bgcolor="#f9fafb" style="padding:12px;font-size:14px;'
        "color:#374151;font-family:Arial,sans-serif;border:1px solid #e5e7eb;"
        'white-space:pre-wrap">{desc}</td></tr>'
        "</table></td></tr>"
        # Footer
        '<tr><td bgcolor="#f9fafb" style="padding:14px 24px;border-top:1px '
        'solid #e5e7eb;font-size:11px;color:#9ca3af;'
        'font-family:Arial,sans-serif">'
        "The full test definition and results are attached as a JSON file."
        "</td></tr>"
        "</table>"
        "<!--[if mso]></td></tr></table><![endif]-->"
        "</body></html>"
    ).format(
        color=color, accent_bg=accent_bg, label=label,
        user=_esc(username), desc=_esc(description),
    )


def _esc(text):
    # type: (str) -> str
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def send_bug_report(session_key, report_type, description, username, payload):
    # type: (str, str, str, str, Dict[str, Any]) -> None
    """Send a bug report email with JSON attachment to the default email."""
    cfg = _get_email_config(session_key)
    smtp_server = cfg["smtp_server"]
    smtp_port = int(cfg["smtp_port"])
    mail_from = cfg["mail_from"]
    recipient = cfg["default_alert_email"]
    smtp_password = cfg.get("smtp_password", "")
    smtp_username = cfg.get("smtp_username", "")
    auth_method = cfg.get("email_auth_method", "none")
    tls_mode = cfg.get("tls_mode", "")

    if not recipient or not EMAIL_PATTERN.match(recipient.strip()):
        raise ValueError(
            "No valid default alert email configured. "
            "Set it in the Admin Setup page."
        )

    label = "Bug Report" if report_type == "bug" else "Feature Request"
    subject = "[Query Tester] {0}: {1}".format(
        label, (description[:60] + "...") if len(description) > 60 else description,
    )

    html_body = _build_html(report_type, description, username)

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = recipient.strip()
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(_build_attachment(payload))

    logger.info(
        "Sending bug report email to %s (server=%s port=%s auth=%s)",
        recipient, smtp_server, smtp_port, auth_method,
    )

    if tls_mode == "ssl":
        server = smtplib.SMTP_SSL(smtp_server, smtp_port)
    else:
        server = smtplib.SMTP(smtp_server, smtp_port)
        if tls_mode == "starttls":
            server.starttls()
    if auth_method == "password" and smtp_username and smtp_password:
        server.login(smtp_username, smtp_password)
    server.sendmail(mail_from, [recipient.strip()], msg.as_string())
    server.quit()

    logger.info("Bug report email sent successfully to %s", recipient)
