# -*- coding: utf-8 -*-
"""
alert_email_html.py — HTML rendering for failure notification emails.

Builds scenario blocks with validation summaries and result row tables.
Mirrors the frontend display logic (column filtering, failed-rows-first sort).
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

TH_STYLE = (
    "padding:4px 8px;text-align:left;font-size:11px;font-weight:600;"
    "color:#94a3b8;border-bottom:1px solid #334155;white-space:nowrap"
)
TD_STYLE = (
    "padding:3px 8px;font-size:12px;border-bottom:1px solid #1e293b;"
    "white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis"
)


# ─── Shared helpers ──────────────────────────────────────────────────────────


def esc(text):
    # type: (str) -> str
    """Escape HTML special characters."""
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


# ─── Row-level validation (mirrors frontend getRowValidation) ────────────────


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
    return True  # unknown condition — don't penalise


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
    field_validations = [v for v in validations if not v.get("field", "").startswith("_")]
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
    """Build an HTML table of up to MAX_EMAIL_ROWS result rows for a scenario.

    Failed rows sorted to the top. Columns match the frontend display.
    """
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

    field_validations = [v for v in validations if not v.get("field", "").startswith("_")]

    header_cells = ['<th style="{s}">#</th>'.format(s=TH_STYLE)]
    for col in col_set_ordered:
        has_fail = any(
            v.get("field") == col and not v.get("passed", True)
            for v in validations
        )
        color = "color:#f87171" if has_fail else "color:#94a3b8"
        header_cells.append(
            '<th style="{s};{c}">{name}</th>'.format(
                s=TH_STYLE, c=color, name=esc(col))
        )
    header = "<tr>" + "".join(header_cells) + "</tr>"

    body_rows = []
    for idx, row in enumerate(display_rows):
        row_passed = True
        if field_validations:
            row_passed, _ = _get_row_validation(row, field_validations)

        row_bg = "#1a0f0f" if not row_passed else (
            "#0f172a" if idx % 2 == 0 else "#111827"
        )

        cells = [
            '<td style="{s};color:#475569">{n}</td>'.format(
                s=TD_STYLE, n=idx + 1)
        ]
        for col in col_set_ordered:
            val = _cell_value(row.get(col))
            has_fail = any(
                v.get("field") == col and not v.get("passed", True)
                for v in validations
            )
            text_color = "#fca5a5" if has_fail else "#cbd5e1"
            cells.append(
                '<td style="{s};color:{c}" title="{t}">{v}</td>'.format(
                    s=TD_STYLE, c=text_color,
                    t=esc(val), v=esc(val[:80]),
                )
            )
        body_rows.append(
            '<tr style="background:{bg}">{cells}</tr>'.format(
                bg=row_bg, cells="".join(cells))
        )

    truncation_note = ""
    if total > MAX_EMAIL_ROWS:
        truncation_note = (
            '<div style="padding:4px 8px;font-size:11px;color:#94a3b8">'
            "Showing {shown} of {total} rows (failed rows first)"
            "</div>"
        ).format(shown=MAX_EMAIL_ROWS, total=total)

    return (
        '<div style="padding:4px 12px 8px">'
        '<div style="font-size:11px;font-weight:600;color:#94a3b8;'
        'text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">'
        "Query Results</div>"
        '<div style="overflow-x:auto;border:1px solid #334155;border-radius:6px">'
        '<table style="width:100%;border-collapse:collapse">'
        "<thead>{header}</thead>"
        "<tbody>{body}</tbody>"
        "</table></div>"
        "{trunc}"
        "</div>"
    ).format(
        header=header,
        body="\n".join(body_rows),
        trunc=truncation_note,
    )


# ─── Validation row + scenario block ────────────────────────────────────────


def _format_validation_row(v):
    # type: (Dict[str, Any]) -> str
    passed = v.get("passed", False)
    icon = "&#10003;" if passed else "&#10007;"
    color = "#4ade80" if passed else "#f87171"
    return (
        "<tr>"
        '<td style="padding:4px 8px;color:{color}">{icon}</td>'
        '<td style="padding:4px 8px">{field}</td>'
        '<td style="padding:4px 8px">{condition}</td>'
        '<td style="padding:4px 8px">{expected}</td>'
        '<td style="padding:4px 8px">{actual}</td>'
        '<td style="padding:4px 8px">{msg}</td>'
        "</tr>"
    ).format(
        color=color,
        icon=icon,
        field=esc(str(v.get("field", ""))),
        condition=esc(str(v.get("condition", ""))),
        expected=esc(str(v.get("expected", ""))),
        actual=esc(str(v.get("actual", ""))),
        msg=esc(str(v.get("message", ""))),
    )


def format_scenario_block(scenario):
    # type: (Dict[str, Any]) -> str
    """Build an HTML block for one scenario result.

    For failed scenarios, includes validation summary AND a result rows
    table (first 20 rows, failed rows sorted to the top).
    """
    passed = scenario.get("passed", False)
    name = esc(scenario.get("scenarioName", "Unknown"))
    badge_bg = "#166534" if passed else "#991b1b"
    badge_text = "PASS" if passed else "FAIL"
    error = scenario.get("error", "")

    header = (
        '<div style="margin-bottom:16px;border:1px solid #334155;'
        'border-radius:8px;overflow:hidden">'
        '<div style="padding:8px 12px;background:#1e293b;'
        'display:flex;align-items:center;gap:8px">'
        '<span style="padding:2px 8px;border-radius:4px;font-size:11px;'
        'font-weight:bold;color:#fff;background:{bg}">{badge}</span>'
        '<span style="font-weight:600;color:#e2e8f0">{name}</span>'
        "</div>"
    ).format(bg=badge_bg, badge=badge_text, name=name)

    body_parts = []

    if error:
        body_parts.append(
            '<div style="padding:8px 12px;color:#fca5a5;font-size:13px">'
            "Error: {0}</div>".format(esc(error))
        )

    validations = scenario.get("validations", [])
    if validations:
        rows = "\n".join(_format_validation_row(v) for v in validations)
        body_parts.append(
            '<table style="width:100%;border-collapse:collapse;font-size:12px;'
            'color:#cbd5e1">'
            "<thead><tr>"
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155"></th>'
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155">Field</th>'
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155">Condition</th>'
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155">Expected</th>'
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155">Actual</th>'
            '<th style="padding:4px 8px;text-align:left;color:#94a3b8;'
            'border-bottom:1px solid #334155">Message</th>'
            "</tr></thead>"
            "<tbody>{rows}</tbody></table>".format(rows=rows)
        )

    result_count = scenario.get("resultCount")
    if result_count is not None:
        body_parts.append(
            '<div style="padding:4px 12px;color:#94a3b8;font-size:11px">'
            "Result rows: {0}</div>".format(result_count)
        )

    # For failed scenarios, include the actual result rows table
    if not passed:
        rows_table = format_result_rows_table(scenario)
        if rows_table:
            body_parts.append(rows_table)

    body_html = "\n".join(body_parts) if body_parts else (
        '<div style="padding:8px 12px;color:#94a3b8;font-size:12px">'
        "No validation details</div>"
    )

    return header + '<div style="padding:8px 0">' + body_html + "</div></div>"
