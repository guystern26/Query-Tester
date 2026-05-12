# -*- coding: utf-8 -*-
"""
ai_guy.py — | aiguy — Splunk custom streaming command.

chunked=true + splunklib for speed. No file writes. No admin-only deps.
"""
from __future__ import annotations

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from splunklib.searchcommands import (
    dispatch,
    StreamingCommand,
    Configuration,
    Option,
)

_ANALYSIS_MODES = {
    "summary", "anomaly", "trend", "compare", "alert", "health", "top"
}
_SPECIAL_MODES = {"extract", "enrich", "explain", "suggest", "dashboard"}
_ALL_MODES = _ANALYSIS_MODES | _SPECIAL_MODES


@Configuration()
class AiGuyCommand(StreamingCommand):
    """| aiguy — Ask AI about your Splunk query results."""

    prompt = Option(require=False, default=None)
    mode = Option(require=False, default=None)
    field = Option(require=False, default=None)
    value = Option(require=False, default=None)
    new_field_name = Option(require=False, default=None)

    def stream(self, records):
        t_start = time.time()

        # ── Metadata ────────────────────────────────────────────────
        session_key = ""
        full_spl = ""
        sid = ""
        try:
            full_spl = self._metadata.searchinfo.search or ""
            sid = self._metadata.searchinfo.sid or ""
            session_key = self._metadata.searchinfo.session_key or ""
        except Exception:
            pass

        mode = (self.mode or "").strip().lower()
        field = (self.field or "").strip()
        value = self.value
        prompt = (self.prompt or "").strip()
        new_field = (self.new_field_name or "").strip()
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        # ── Validate ────────────────────────────────────────────────
        err = ""
        if mode and mode not in _ALL_MODES:
            err = 'Unknown mode="{0}". Valid: {1}.'.format(
                mode, ", ".join(sorted(_ALL_MODES)))
        elif not mode and not prompt:
            err = 'Missing prompt= or mode=. Example: | aiguy prompt="..."'
        elif value is not None and not field:
            err = 'value= requires field=.'
        if err:
            for record in records:
                row = dict(record)
                row["ai_answer"] = err
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "error"
                yield row
                break
            return

        # ── Rate limit (scheduled only) ─────────────────────────────
        saved_search = ""
        if sid.startswith("scheduler__"):
            parts = sid.split("__")
            if len(parts) >= 2:
                saved_search = parts[1]
        if saved_search:
            from aiguy.llm import should_skip_scheduled
            if should_skip_scheduled(session_key, saved_search):
                for idx, record in enumerate(records):
                    row = dict(record)
                    if idx == 0:
                        row["ai_answer"] = "(aiguy skipped — last run < 10 min ago)"
                    row["aiguy_timestamp"] = ts
                    row["aiguy_source"] = "rate-limited"
                    yield row
                return

        # ── LLM config ──────────────────────────────────────────────
        from aiguy.llm import get_llm_config, log_usage
        try:
            llm_cfg = get_llm_config(session_key)
        except Exception as exc:
            for record in records:
                row = dict(record)
                row["ai_answer"] = "AI error: {0}".format(exc)
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "error"
                yield row
                break
            return

        # ── Dispatch ────────────────────────────────────────────────
        if mode == "dashboard":
            from aiguy.dashboard import handle_dashboard
            handler = handle_dashboard(records, llm_cfg, prompt, t_start)
        elif mode == "explain":
            from aiguy.handlers import handle_explain
            handler = handle_explain(
                records, llm_cfg, full_spl, field, prompt, t_start)
        elif mode == "suggest":
            from aiguy.handlers import handle_suggest
            handler = handle_suggest(
                records, llm_cfg, full_spl, field, prompt, t_start)
        elif mode == "enrich":
            from aiguy.handlers import handle_enrich
            handler = handle_enrich(
                records, llm_cfg, field, prompt, new_field, t_start)
        elif mode == "extract":
            from aiguy.handlers import handle_extract
            handler = handle_extract(
                records, llm_cfg, field, prompt, new_field, t_start)
        else:
            from aiguy.handlers import handle_analysis
            handler = handle_analysis(
                records, llm_cfg, full_spl, mode,
                field, value, prompt, self.mode or "", t_start)

        for row in handler:
            yield row


dispatch(AiGuyCommand, sys.argv, sys.stdin, sys.stdout, __name__)
