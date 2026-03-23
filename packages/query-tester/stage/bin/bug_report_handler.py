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
    content = json.dumps(payload, indent=2, default=str)
    part = MIMEBase("application", "json")
    part.set_payload(content.encode("utf-8"))
    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition", "attachment", filename="bug_report.json",
    )
    return part


def _build_html(report_type, description, username):
    # type: (str, str, str) -> str
    label = "Bug Report" if report_type == "bug" else "Feature Request"
    color = "#f87171" if report_type == "bug" else "#60a5fa"
    return (
        '<div style="font-family:Arial,sans-serif;max-width:600px;'
        'margin:0 auto;padding:20px">'
        '<h2 style="color:{color};margin:0 0 16px">'
        "Query Tester {label}</h2>"
        '<table style="width:100%;border-collapse:collapse;'
        'font-size:14px;margin-bottom:16px">'
        "<tr>"
        '<td style="padding:6px 12px;color:#94a3b8;width:100px">'
        "Type</td>"
        '<td style="padding:6px 12px;color:#e2e8f0">{label}</td>'
        "</tr>"
        "<tr>"
        '<td style="padding:6px 12px;color:#94a3b8">Reported by</td>'
        '<td style="padding:6px 12px;color:#e2e8f0">{user}</td>'
        "</tr>"
        "</table>"
        '<div style="padding:12px;background:#1e293b;border:1px solid #334155;'
        'border-radius:8px;color:#e2e8f0;font-size:14px;'
        'white-space:pre-wrap">{desc}</div>'
        '<p style="margin-top:16px;font-size:12px;color:#64748b">'
        "The full test definition and results are attached as a JSON file."
        "</p>"
        "</div>"
    ).format(
        color=color, label=label,
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
