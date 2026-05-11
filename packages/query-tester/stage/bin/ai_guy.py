# -*- coding: utf-8 -*-
"""
ai_guy.py — Custom Splunk streaming command: | aiguy

No splunklib dependency. Reads CSV from stdin, writes CSV to stdout.
Authenticates to Splunk via admin credentials from config.py for
the rate limit check. Any user can run this command.
"""
from __future__ import annotations

import csv
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from aiguy.prompts import MODE_PROMPTS, SPECIAL_MODES
from aiguy.llm import get_llm_config, should_skip_scheduled, log_usage
from aiguy.handlers import (
    handle_explain,
    handle_suggest,
    handle_enrich,
    handle_extract,
    handle_analysis,
)


def _parse_args(argv):
    # type: (list) -> dict
    """Parse key=value arguments from the command line."""
    opts = {}  # type: dict
    for arg in argv:
        if "=" in arg:
            key, _, val = arg.partition("=")
            # Strip quotes
            val = val.strip('"').strip("'")
            opts[key.strip().lower()] = val
    return opts


def _get_session_key():
    # type: () -> str
    """Get a session key using admin credentials from config.py."""
    try:
        import config as cfg
        from splunklib import client as splunk_client
        service = splunk_client.connect(
            host=cfg.SPLUNK_HOST,
            port=cfg.SPLUNK_PORT,
            scheme=cfg.SPLUNK_SCHEME,
            username=cfg.SPLUNK_USERNAME,
            password=cfg.SPLUNK_PASSWORD,
            app="query-tester",
            autologin=True,
        )
        return service.token
    except Exception:
        return ""


def _read_input():
    # type: () -> list
    """Read CSV rows from stdin (Splunk pipes results here)."""
    rows = []
    reader = csv.DictReader(sys.stdin)
    for row in reader:
        rows.append(dict(row))
    return rows


def _write_output(rows):
    # type: (list) -> None
    """Write CSV rows to stdout."""
    if not rows:
        return
    # Collect all field names from all rows
    fields = []  # type: list
    seen = set()  # type: set
    for row in rows:
        for k in row.keys():
            if k not in seen:
                seen.add(k)
                fields.append(k)
    writer = csv.DictWriter(sys.stdout, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)


def _validate(opts):
    # type: (dict) -> str
    """Return error message or empty string."""
    mode_key = opts.get("mode", "")
    valid_modes = set(MODE_PROMPTS.keys()) | SPECIAL_MODES | {""}
    if mode_key and mode_key not in valid_modes:
        all_modes = sorted(MODE_PROMPTS.keys()) + sorted(SPECIAL_MODES)
        return 'Unknown mode="{0}". Valid: {1}.'.format(
            mode_key, ", ".join(all_modes))
    if not mode_key and not opts.get("prompt", ""):
        return (
            "Missing prompt= or mode=. Examples: "
            '| aiguy prompt="which host is busiest?" '
            '| aiguy mode="summary" '
            '| aiguy mode="enrich" field="status" prompt="classify"'
        )
    if opts.get("value") and not opts.get("field"):
        return 'value= requires field=. Example: | aiguy field="status" value="500" prompt="..."'
    return ""


def main():
    t_start = time.time()

    # Parse command arguments (Splunk passes them after the command name)
    # argv looks like: ['ai_guy.py', 'prompt=...', 'mode=...', ...]
    opts = _parse_args(sys.argv[1:])
    mode_key = opts.get("mode", "").strip().lower()
    field = opts.get("field", "").strip()
    value = opts.get("value", "")
    prompt = opts.get("prompt", "").strip()
    new_field_name = opts.get("new_field_name", "").strip()

    # Read all input rows
    rows = _read_input()

    # Validation
    err = _validate(opts)
    if err:
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        if rows:
            rows[0]["ai_answer"] = err
            rows[0]["aiguy_timestamp"] = ts
            rows[0]["aiguy_source"] = "error"
            _write_output(rows[:1])
        else:
            _write_output([{"ai_answer": err, "aiguy_timestamp": ts,
                            "aiguy_source": "error"}])
        return

    # Get session key for rate limit check
    session_key = _get_session_key()

    # Rate limit for scheduled searches
    # (detect from environment — Splunk sets SPLUNK_SID)
    sid = os.environ.get("SPLUNK_DISPATCH_CHECK_SID", "")
    saved_search = ""
    if sid.startswith("scheduler__"):
        parts = sid.split("__")
        if len(parts) >= 2:
            saved_search = parts[1]

    if saved_search and should_skip_scheduled(session_key, saved_search):
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        for idx, row in enumerate(rows):
            if idx == 0:
                row["ai_answer"] = "(aiguy skipped — last run < 10 min ago)"
            row["aiguy_timestamp"] = ts
            row["aiguy_source"] = "rate-limited"
        _write_output(rows)
        log_usage("rate-limited", field, prompt,
                  "rate-limited", len(rows), t_start)
        return

    # Get LLM config
    try:
        llm_cfg = get_llm_config(session_key)
    except Exception as exc:
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        err_msg = "AI error: {0}".format(str(exc))
        if rows:
            rows[0]["ai_answer"] = err_msg
            rows[0]["aiguy_timestamp"] = ts
            rows[0]["aiguy_source"] = "error"
            _write_output(rows[:1])
        else:
            _write_output([{"ai_answer": err_msg, "aiguy_timestamp": ts,
                            "aiguy_source": "error"}])
        log_usage("config-error", field, prompt, "error", len(rows), t_start)
        return

    # Get full SPL from environment (Splunk sets this for search commands)
    full_spl = os.environ.get("SPLUNK_SEARCH", "")

    # Create an iterator-like interface from the rows list
    # (handlers expect an iterator of records)
    def row_iter():
        for r in rows:
            yield r

    # Dispatch to handler
    if mode_key == "explain":
        handler = handle_explain(
            row_iter(), llm_cfg, full_spl, field, prompt, t_start)
    elif mode_key == "suggest":
        handler = handle_suggest(
            row_iter(), llm_cfg, full_spl, field, prompt, t_start)
    elif mode_key == "enrich":
        handler = handle_enrich(
            row_iter(), llm_cfg, field, prompt, new_field_name, t_start)
    elif mode_key == "extract":
        handler = handle_extract(
            row_iter(), llm_cfg, field, prompt, new_field_name, t_start)
    else:
        handler = handle_analysis(
            row_iter(), llm_cfg, full_spl, mode_key,
            field, value, prompt, opts.get("mode", ""), t_start)

    result = list(handler)
    _write_output(result)


if __name__ == "__main__":
    main()
