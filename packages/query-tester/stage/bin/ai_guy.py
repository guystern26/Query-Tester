# -*- coding: utf-8 -*-
"""
ai_guy.py — Custom Splunk streaming command: | aiguy

Pure CSV stdin/stdout. All imports lazy for fast startup.
"""
from __future__ import annotations

import csv
import os
import sys
import time

_BIN = os.path.dirname(os.path.abspath(__file__))
if _BIN not in sys.path:
    sys.path.insert(0, _BIN)

# Valid modes — hardcoded to avoid importing prompts at startup
_ANALYSIS_MODES = {
    "summary", "anomaly", "trend", "compare", "alert", "health", "top"
}
_SPECIAL_MODES = {"extract", "enrich", "explain", "suggest", "dashboard"}
_ALL_MODES = _ANALYSIS_MODES | _SPECIAL_MODES


def _parse_args(argv):
    # type: (list) -> dict
    opts = {}  # type: dict
    for arg in argv:
        if "=" in arg:
            k, _, v = arg.partition("=")
            opts[k.strip().lower()] = v.strip('"').strip("'")
    return opts


def _read_input():
    # type: () -> list
    """Read CSV from stdin. Splits on blank line to skip Splunk metadata."""
    raw = sys.stdin.read()
    if "\n\n" in raw:
        _, csv_text = raw.split("\n\n", 1)
    elif "\r\n\r\n" in raw:
        _, csv_text = raw.split("\r\n\r\n", 1)
    else:
        csv_text = raw
    rows = []
    csv_text = csv_text.strip()
    if csv_text:
        for row in csv.DictReader(csv_text.splitlines()):
            rows.append(dict(row))
    return rows


def _write_output(rows):
    # type: (list) -> None
    if not rows:
        return
    fields = []  # type: list
    seen = set()  # type: set
    for row in rows:
        for k in row:
            if k not in seen:
                seen.add(k)
                fields.append(k)
    w = csv.DictWriter(sys.stdout, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    for row in rows:
        # Sanitize AI fields — collapse newlines to keep CSV clean
        for k in ("ai_answer", "explanation", "label"):
            if k in row and row[k]:
                row[k] = row[k].replace("\r\n", "; ").replace("\n", "; ").replace("\r", "; ")
        w.writerow(row)


def _error_out(rows, msg):
    # type: (list, str) -> None
    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    out = rows[:1] if rows else [{}]
    out[0]["ai_answer"] = msg
    out[0]["aiguy_timestamp"] = ts
    out[0]["aiguy_source"] = "error"
    _write_output(out)


def main():
    t_start = time.time()
    opts = _parse_args(sys.argv[1:])
    mode = opts.get("mode", "").strip().lower()
    field = opts.get("field", "").strip()
    value = opts.get("value", "")
    prompt = opts.get("prompt", "").strip()
    new_field = opts.get("new_field_name", "").strip()

    # ── Validate (no imports needed) ────────────────────────────────
    if mode and mode not in _ALL_MODES:
        rows = _read_input()
        _error_out(rows, 'Unknown mode="{0}". Valid: {1}.'.format(
            mode, ", ".join(sorted(_ALL_MODES))))
        return
    if not mode and not prompt:
        rows = _read_input()
        _error_out(rows, 'Missing prompt= or mode=. Example: | aiguy prompt="..."')
        return
    if value and not field:
        rows = _read_input()
        _error_out(rows, 'value= requires field=.')
        return

    # ── Read data ───────────────────────────────────────────────────
    rows = _read_input()
    if not rows and mode != "explain":
        _error_out([], "No input data.")
        return

    # ── Rate limit (lazy import, only for scheduled) ────────────────
    sid = os.environ.get("SPLUNK_DISPATCH_CHECK_SID", "")
    if sid.startswith("scheduler__"):
        parts = sid.split("__")
        if len(parts) >= 2:
            from aiguy.llm import should_skip_scheduled
            try:
                from splunklib import client as sc
                import config as cfg
                svc = sc.connect(
                    host=cfg.SPLUNK_HOST, port=cfg.SPLUNK_PORT,
                    scheme=cfg.SPLUNK_SCHEME,
                    username=cfg.SPLUNK_USERNAME,
                    password=cfg.SPLUNK_PASSWORD,
                    app="query-tester", autologin=True,
                )
                if should_skip_scheduled(svc.token, parts[1]):
                    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
                    if rows:
                        rows[0]["ai_answer"] = "(aiguy skipped — last run < 10 min ago)"
                    for r in rows:
                        r["aiguy_timestamp"] = ts
                        r["aiguy_source"] = "rate-limited"
                    _write_output(rows)
                    return
            except Exception:
                pass

    # ── LLM config (lazy import) ────────────────────────────────────
    from aiguy.llm import get_llm_config, log_usage
    try:
        llm_cfg = get_llm_config("")
    except Exception as exc:
        _error_out(rows, "AI error: {0}".format(exc))
        return

    full_spl = os.environ.get("SPLUNK_SEARCH", "")

    # ── Dispatch (lazy import per mode) ─────────────────────────────
    def row_iter():
        for r in rows:
            yield r

    if mode == "dashboard":
        from aiguy.dashboard import handle_dashboard
        result = list(handle_dashboard(
            row_iter(), llm_cfg, prompt, t_start))
    elif mode == "explain":
        from aiguy.handlers import handle_explain
        result = list(handle_explain(
            row_iter(), llm_cfg, full_spl, field, prompt, t_start))
    elif mode == "suggest":
        from aiguy.handlers import handle_suggest
        result = list(handle_suggest(
            row_iter(), llm_cfg, full_spl, field, prompt, t_start))
    elif mode == "enrich":
        from aiguy.handlers import handle_enrich
        result = list(handle_enrich(
            row_iter(), llm_cfg, field, prompt, new_field, t_start))
    elif mode == "extract":
        from aiguy.handlers import handle_extract
        result = list(handle_extract(
            row_iter(), llm_cfg, field, prompt, new_field, t_start))
    else:
        from aiguy.handlers import handle_analysis
        result = list(handle_analysis(
            row_iter(), llm_cfg, full_spl, mode,
            field, value, prompt, opts.get("mode", ""), t_start))

    _write_output(result)
    log_usage(mode or "prompt", field, prompt,
              "live", len(rows), t_start)


if __name__ == "__main__":
    main()
