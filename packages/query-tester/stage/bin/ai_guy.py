# -*- coding: utf-8 -*-
"""
ai_guy.py — Custom Splunk streaming command: | aiguy

Thin entry point. All logic lives in the aiguy/ package.
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

from aiguy.prompts import MODE_PROMPTS, SPECIAL_MODES
from aiguy.llm import get_llm_config, should_skip_scheduled, log_usage
from aiguy.handlers import (
    handle_explain,
    handle_suggest,
    handle_enrich,
    handle_extract,
    handle_analysis,
)


@Configuration()
class AiGuyCommand(StreamingCommand):
    """| aiguy — Ask AI about your Splunk query results."""

    prompt = Option(
        doc="The question to ask the AI",
        require=False, default=None,
    )
    mode = Option(
        doc="Preset: summary, anomaly, trend, compare, alert, health, "
            "top, extract, enrich, explain, suggest",
        require=False, default=None,
    )
    field = Option(
        doc="Focus on a specific field (required for extract/enrich)",
        require=False, default=None,
    )
    value = Option(
        doc="Filter rows where field equals this value",
        require=False, default=None,
    )
    new_field_name = Option(
        doc="Name of the new field (extract/enrich mode)",
        require=False, default=None,
    )

    def stream(self, records):
        t_start = time.time()

        # ── Metadata ────────────────────────────────────────────────────
        session_key = ""
        full_spl = ""
        sid = ""
        try:
            full_spl = self._metadata.searchinfo.search or ""
            sid = self._metadata.searchinfo.sid or ""
            session_key = self._metadata.searchinfo.session_key or ""
        except Exception:
            pass

        saved_search = ""
        if sid.startswith("scheduler__"):
            parts = sid.split("__")
            if len(parts) >= 2:
                saved_search = parts[1]

        mode_key = (self.mode or "").strip().lower()
        valid_modes = set(MODE_PROMPTS.keys()) | SPECIAL_MODES | {""}
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        # ── Validation ──────────────────────────────────────────────────
        err = self._validate(mode_key, valid_modes)
        if err:
            for record in records:
                row = dict(record)
                row["ai_answer"] = err
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "error"
                yield row
                break
            log_usage("validation", self.field, self.prompt,
                      "error", 1, t_start)
            return

        # ── Rate limit (scheduled searches only) ────────────────────────
        if saved_search and should_skip_scheduled(session_key, saved_search):
            row_count = 0
            for idx, record in enumerate(records):
                row = dict(record)
                if idx == 0:
                    row["ai_answer"] = "(aiguy skipped — last run < 10 min ago)"
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "rate-limited"
                row_count += 1
                yield row
            log_usage("rate-limited", self.field, self.prompt,
                      "rate-limited", row_count, t_start)
            return

        # ── LLM config ──────────────────────────────────────────────────
        try:
            llm_cfg = get_llm_config(session_key)
        except Exception as exc:
            err_msg = "AI error: {0}".format(str(exc))
            row_count = 0
            for idx, record in enumerate(records):
                row = dict(record)
                if idx == 0:
                    row["ai_answer"] = err_msg
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "error"
                row_count += 1
                yield row
            log_usage("config-error", self.field, self.prompt,
                      "error", row_count, t_start)
            return

        # ── Dispatch to handler ─────────────────────────────────────────
        field = (self.field or "").strip()
        prompt = (self.prompt or "").strip()
        new_field = (self.new_field_name or "").strip()

        if mode_key == "explain":
            handler = handle_explain(
                records, llm_cfg, full_spl, field, prompt, t_start)
        elif mode_key == "suggest":
            handler = handle_suggest(
                records, llm_cfg, full_spl, field, prompt, t_start)
        elif mode_key == "enrich":
            handler = handle_enrich(
                records, llm_cfg, field, prompt, new_field, t_start)
        elif mode_key == "extract":
            handler = handle_extract(
                records, llm_cfg, field, prompt, new_field, t_start)
        else:
            handler = handle_analysis(
                records, llm_cfg, full_spl, mode_key,
                field, self.value, prompt, self.mode, t_start)

        for row in handler:
            yield row

    def _validate(self, mode_key, valid_modes):
        # type: (str, set) -> str
        """Return error message string, or empty string if valid."""
        if mode_key and mode_key not in valid_modes:
            all_modes = sorted(MODE_PROMPTS.keys()) + sorted(SPECIAL_MODES)
            return 'Unknown mode="{0}". Valid modes: {1}.'.format(
                self.mode, ", ".join(all_modes))

        if not mode_key and not (self.prompt or "").strip():
            return (
                "Missing prompt= or mode=. Examples:\n"
                '| aiguy prompt="which host is busiest?"\n'
                '| aiguy mode="summary"\n'
                '| aiguy mode="extract" field="email" '
                'prompt="extract the domain"'
            )

        if self.value is not None and not (self.field or "").strip():
            return (
                'value="{0}" requires field= to know which column to filter. '
                'Example: | aiguy field="status" value="critical" prompt="..."'
            ).format(self.value)

        return ""


dispatch(AiGuyCommand, sys.argv, sys.stdin, sys.stdout, __name__)
