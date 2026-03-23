# -*- coding: utf-8 -*-
"""
alert_email_html.py — Outlook-compatible HTML rendering for failure emails.

Uses table-based layout only. No divs for layout, no border-radius, no flex,
no CSS shorthand. Works in Outlook 2013+, Outlook 365, OWA, Gmail, Apple Mail.
Neutral light design that renders correctly in both light and dark modes.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

MAX_EMAIL_ROWS = 20

RUN_ID_PATTERN = re.compile(r"^run_id_[0-9a-f]{6,16}$", re.IGNORECASE)

HIDDEN_SPLUNK_FIELDS = frozenset([
    "punct", "source", "sourcetype", "splunk_server", "splunk_server_group",
    "index", "host", "linecount", "timeendpos", "timestartpos",
    "eventtype", "tag", "tag::eventtype",
])

# ─── Shared helpers ──────────────────────────────────────────────────────────


def esc(text):
    # type: (str) -> str
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _is_visible_column(key):
    # type: (str) -> bool
    if key.startswith("_"):
        return False
    if key in HIDDEN_SPLUNK_FIELDS:
        return False
    if RUN_ID_PATTERN.match(key):
        return False
    return True


def _cell_value(raw):
    # type: (Any) -> str
    if isinstance(raw, list):
        return " ".join(str(x) for x in raw)
    s = str(raw) if raw is not None else ""
    return s.replace("\n", " ")


# ─── Row-level validation ───────────────────────────────────────────────────


def _evaluate_condition(condition, actual, expected):
    # type: (str, str, str) -> bool
    cond = condition.lower().replace(" ", "_")
    if cond in ("equals", "equal_to"):
        return actual == expected
    if cond == "not_equals":
        return actual != expected
    if cond == "contains":
        return expected.lower() in actual.lower()
    if cond == "not_contains":
        return expected.lower() not in actual.lower()
    if cond == "starts_with":
        return actual.lower().startswith(expected.lower())
    if cond == "ends_with":
        return actual.lower().endswith(expected.lower())
    if cond in ("greater_than", "gt"):
        try:
            return float(actual) > float(expected)
        except (ValueError, TypeError):
            return False
    if cond in ("less_than", "lt"):
        try:
            return float(actual) < float(expected)
        except (ValueError, TypeError):
            return False
    if cond == "exists":
        return actual != ""
    if cond == "not_exists":
        return actual == ""
    if cond == "matches_regex":
        try:
            return bool(re.search(expected, actual))
        except re.error:
            return False
    return True


def _get_row_validation(row, validations):
    # type: (Dict[str, Any], List[Dict[str, Any]]) -> Tuple[bool, List[str]]
    notes = []  # type: List[str]
    all_passed = True
    for v in validations:
        field = v.get("field", "")
        if field.startswith("_"):
            continue
        actual = str(row.get(field, "") or "")
        expected = str(v.get("expected", "") or "")
        condition = str(v.get("condition", ""))
        if not _evaluate_condition(condition, actual, expected):
            all_passed = False
            notes.append("{f}: expected {c} {e}, got \"{a}\"".format(
                f=field,
                c=condition.replace("_", " "),
                e=expected,
                a=actual or "(empty)",
            ))
    return all_passed, notes


def _sort_rows_failed_first(rows, validations):
    # type: (List[Dict[str, Any]], List[Dict[str, Any]]) -> List[Dict[str, Any]]
    if not validations:
        return rows
    field_validations = [
        v for v in validations if not v.get("field", "").startswith("_")
    ]
    if not field_validations:
        return rows

    def sort_key(row):
        # type: (Dict[str, Any]) -> int
        passed, _ = _get_row_validation(row, field_validations)
        return 1 if passed else 0

    return sorted(rows, key=sort_key)


# ─── Result rows table ──────────────────────────────────────────────────────


def format_result_rows_table(scenario):
    # type: (Dict[str, Any]) -> str
    result_rows = scenario.get("resultRows", [])
    if not result_rows:
        return ""

    col_set_ordered = []  # type: List[str]
    col_seen = set()  # type: set
    for row in result_rows:
        for key in row:
            if key not in col_seen and _is_visible_column(key):
                col_set_ordered.append(key)
                col_seen.add(key)
    if not col_set_ordered:
        return ""

    validations = scenario.get("validations", [])
    sorted_rows = _sort_rows_failed_first(result_rows, validations)
    display_rows = sorted_rows[:MAX_EMAIL_ROWS]
    total = len(result_rows)
    field_vals = [
        v for v in validations if not v.get("field", "").startswith("_")
    ]

    # Header
    th = (
        'class="em-muted em-border" style="padding:6px 10px;text-align:left;'
        'font-size:11px;font-weight:bold;color:#6b7280;'
        'border-bottom:2px solid #d1d5db;font-family:Arial,sans-serif"'
    )
    hcells = '<th {s}>#</th>'.format(s=th)
    for col in col_set_ordered:
        has_fail = any(
            v.get("field") == col and not v.get("passed", True)
            for v in validations
        )
        color = "color:#dc2626" if has_fail else "color:#6b7280"
        cls = "" if has_fail else 'class="em-muted em-border"'
        hcells += (
            '<th {cls} style="padding:6px 10px;text-align:left;font-size:11px;'
            'font-weight:bold;{c};border-bottom:2px solid #d1d5db;'
            'font-family:Arial,sans-serif">{n}</th>'
        ).format(cls=cls, c=color, n=esc(col))
    header = "<tr>" + hcells + "</tr>"

    # Body rows
    rows_html = []
    for idx, row in enumerate(display_rows):
        row_passed = True
        if field_vals:
            row_passed, _ = _get_row_validation(row, field_vals)

        if not row_passed:
            row_bg = "#fef2f2"
            row_cls = "em-row-fail"
        elif idx % 2 == 0:
            row_bg = "#ffffff"
            row_cls = "em-row-even"
        else:
            row_bg = "#f9fafb"
            row_cls = "em-row-odd"

        cells = (
            '<td class="em-muted em-border" style="padding:4px 10px;'
            'font-size:12px;color:#9ca3af;border-bottom:1px solid #e5e7eb;'
            'font-family:Arial,sans-serif">{n}</td>'
        ).format(n=idx + 1)

        for col in col_set_ordered:
            val = _cell_value(row.get(col))
            has_fail = any(
                v.get("field") == col and not v.get("passed", True)
                for v in validations
            )
            tc = "color:#dc2626" if has_fail else "color:#374151"
            cls = "" if has_fail else 'class="em-text em-border"'
            cells += (
                '<td {cls} style="padding:4px 10px;font-size:12px;{c};'
                'border-bottom:1px solid #e5e7eb;font-family:Arial,sans-serif"'
                ' title="{t}">{v}</td>'
            ).format(cls=cls, c=tc, t=esc(val), v=esc(val[:80]))

        rows_html.append(
            '<tr class="{rc}" bgcolor="{bg}">{cells}</tr>'.format(
                rc=row_cls, bg=row_bg, cells=cells,
            )
        )

    trunc = ""
    if total > MAX_EMAIL_ROWS:
        trunc = (
            '<tr><td colspan="{cols}" class="em-muted"'
            ' style="padding:6px 10px;font-size:11px;'
            'color:#9ca3af;font-family:Arial,sans-serif">'
            "Showing {shown} of {total} rows (failed rows first)"
            "</td></tr>"
        ).format(cols=len(col_set_ordered) + 1, shown=MAX_EMAIL_ROWS, total=total)

    return (
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        "<tr><td>"
        '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
        ' class="em-scen-border"'
        ' style="border:1px solid #d1d5db;border-collapse:collapse">'
        "<thead>{header}</thead>"
        "<tbody>{body}{trunc}</tbody>"
        "</table>"
        "</td></tr></table>"
    ).format(header=header, body="\n".join(rows_html), trunc=trunc)


# ─── Validation row + scenario block ────────────────────────────────────────


def _format_validation_row(v):
    # type: (Dict[str, Any]) -> str
    passed = v.get("passed", False)
    icon = "&#10003;" if passed else "&#10007;"
    color = "#16a34a" if passed else "#dc2626"
    td = (
        'class="em-text em-border" style="padding:5px 10px;font-size:12px;'
        'border-bottom:1px solid #e5e7eb;color:#374151;'
        'font-family:Arial,sans-serif"'
    )
    return (
        "<tr>"
        '<td class="em-border" style="padding:5px 10px;font-size:14px;'
        'border-bottom:1px solid #e5e7eb;color:{color};'
        'font-family:Arial,sans-serif;text-align:center"'
        ">{icon}</td>"
        "<td {td}>{field}</td>"
        "<td {td}>{condition}</td>"
        "<td {td}>{expected}</td>"
        "<td {td}>{actual}</td>"
        "<td {td}>{msg}</td>"
        "</tr>"
    ).format(
        color=color, icon=icon, td=td,
        field=esc(str(v.get("field", ""))),
        condition=esc(str(v.get("condition", ""))),
        expected=esc(str(v.get("expected", ""))),
        actual=esc(str(v.get("actual", ""))),
        msg=esc(str(v.get("message", ""))),
    )


def format_scenario_block(scenario):
    # type: (Dict[str, Any]) -> str
    passed = scenario.get("passed", False)
    name = esc(scenario.get("scenarioName", "Unknown"))
    badge_bg = "#16a34a" if passed else "#dc2626"
    badge_text = "PASS" if passed else "FAIL"
    error = scenario.get("error", "")

    # Scenario header
    header = (
        '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
        ' class="em-scen-border"'
        ' style="margin-bottom:16px;border:1px solid #d1d5db">'
        '<tr><td class="em-scen-head" bgcolor="#f3f4f6"'
        ' style="padding:10px 12px;font-family:Arial,sans-serif">'
        '<table cellpadding="0" cellspacing="0" border="0"><tr>'
        '<td bgcolor="{bg}" style="padding:3px 10px;font-size:11px;'
        'font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;'
        'letter-spacing:0.5px">{badge}</td>'
        '<td class="em-head" style="padding-left:10px;font-size:14px;'
        'font-weight:bold;color:#1f2937;'
        'font-family:Arial,sans-serif">{name}</td>'
        "</tr></table>"
        "</td></tr>"
    ).format(bg=badge_bg, badge=badge_text, name=name)

    body_parts = []

    if error:
        body_parts.append(
            '<tr><td style="padding:8px 12px;color:#dc2626;font-size:13px;'
            'font-family:Arial,sans-serif">Error: {0}</td></tr>'.format(
                esc(error),
            )
        )

    # Validation table
    validations = scenario.get("validations", [])
    if validations:
        th = (
            'class="em-muted em-border" style="padding:5px 10px;'
            'text-align:left;font-size:11px;font-weight:bold;color:#6b7280;'
            'border-bottom:2px solid #d1d5db;font-family:Arial,sans-serif"'
        )
        rows = "\n".join(_format_validation_row(v) for v in validations)
        body_parts.append(
            "<tr><td>"
            '<table cellpadding="0" cellspacing="0" border="0" width="100%"'
            ' style="border-collapse:collapse">'
            "<thead><tr>"
            "<th {th}></th>"
            "<th {th}>Field</th>"
            "<th {th}>Condition</th>"
            "<th {th}>Expected</th>"
            "<th {th}>Actual</th>"
            "<th {th}>Message</th>"
            "</tr></thead>"
            "<tbody>{rows}</tbody></table>"
            "</td></tr>".format(th=th, rows=rows)
        )

    # Result count
    result_count = scenario.get("resultCount")
    if result_count is not None:
        body_parts.append(
            '<tr><td class="em-muted" style="padding:6px 12px;color:#9ca3af;'
            'font-size:11px;font-family:Arial,sans-serif">'
            "Result rows: {0}</td></tr>".format(result_count)
        )

    # Result rows table for failed scenarios
    if not passed:
        rows_table = format_result_rows_table(scenario)
        if rows_table:
            body_parts.append(
                "<tr><td style=\"padding:4px 12px 8px\">"
                "{0}</td></tr>".format(rows_table)
            )

    body_html = "\n".join(body_parts) if body_parts else (
        '<tr><td class="em-muted" style="padding:8px 12px;color:#9ca3af;'
        'font-size:12px;font-family:Arial,sans-serif">'
        "No validation details</td></tr>"
    )

    return (
        header
        + '<tr><td><table cellpadding="0" cellspacing="0" border="0"'
        ' width="100%">' + body_html + "</table></td></tr></table>"
    )
