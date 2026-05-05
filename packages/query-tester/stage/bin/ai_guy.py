# -*- coding: utf-8 -*-
"""
ai_guy.py — Custom Splunk search command: ask AI about your query results.

Architecture:
    - StreamingCommand: receives upstream results, adds ai_answer field, yields all rows
    - READ-ONLY: never executes SPL, never modifies data, never writes to indexes
    - Only external call: HTTPS POST to the configured LLM endpoint
    - Config: reads LLM settings from runtime_config (cached, 120s TTL)
    - Rate limit: for scheduled searches, checks saved search dispatch history
      via HTTP — skips LLM if it ran less than 10 minutes ago

Performance:
    - Uses session token from search metadata (no username/password auth roundtrip)
    - Config comes from runtime_config module (already cached with 120s TTL)
    - Ad-hoc searches skip rate-limit check entirely
    - No direct KVStore access — everything goes through runtime_config

Usage:
    ... | aiguy prompt="which sourcetype has the most events?"
    ... | aiguy mode="anomaly"
    ... | aiguy mode="alert" field="action" value="blocked"
    ... | aiguy prompt="explain" field="status" value="Error"

Requires: Splunk 9.2+, LLM configured in Query Tester setup page.
"""
from __future__ import annotations

import json
import os
import ssl
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from splunklib.searchcommands import (
    dispatch,
    StreamingCommand,
    Configuration,
    Option,
)

# ── Constants ────────────────────────────────────────────────────────────────

MAX_ROWS_FOR_AI = 20   # rows sent to LLM (all rows still pass through)
MAX_COLS_FOR_AI = 10   # columns sent to LLM
MAX_CELL_LEN = 80      # truncate cell values for LLM prompt
LLM_TIMEOUT_SECS = 30  # HTTP timeout for LLM call
MAX_RESPONSE_TOKENS = 600  # cap LLM response length
MIN_INTERVAL_SECS = 600  # 10 min — skip LLM if scheduled search ran recently

SYSTEM_PROMPT = (
    "You are an AI assistant embedded in a Splunk search pipeline. "
    "You receive the full SPL query, its results as a table, and a user question.\n\n"
    "Rules:\n"
    "- Consider BOTH the query logic AND the result data when answering.\n"
    "- Answer concisely in 1-3 sentences.\n"
    "- Focus on the data — reference specific values, counts, or patterns.\n"
    "- If the query has filters, aggregations, or joins, factor those into your analysis.\n"
    "- The query may contain commands like outputlookup, cache, collect, etc. "
    "That is fine — they already ran. Focus on analyzing the RESULTS, not the commands.\n"
    "- Do NOT use markdown, code blocks, or bullet points.\n"
    "- Return ONLY plain text — your answer appears as a field value in Splunk.\n\n"
    "SAFETY:\n"
    "- When suggesting SPL improvements, NEVER include destructive commands "
    "(delete, outputlookup, collect, sendemail, mcollect, script, run).\n"
    "- You are an ANALYST — you observe and explain. "
    "Your suggestions must be read-only queries only."
)

MODE_PROMPTS = {
    "summary": "Summarize the key findings from these results. "
               "What are the most important takeaways?",
    "anomaly": "Identify any outliers, anomalies, or unusual patterns in this data. "
               "What stands out?",
    "trend": "Describe any trends over time in this data. "
             "Is it increasing, decreasing, or stable?",
    "compare": "Compare the different groups in this data. "
               "What are the main differences?",
    "alert": "Based on this data, should an alert be triggered? "
             "Answer yes or no, and explain why briefly.",
    "health": "Assess the overall health or status shown by this data. "
              "Are there any concerns?",
    "top": "What are the top items and why are they significant?",
}

# ── LLM Config ───────────────────────────────────────────────────────────────


def _get_llm_config(session_key):
    # type: (str) -> dict
    """Read LLM settings from runtime_config (cached, 120s TTL).
    No direct KVStore access — runtime_config handles everything.
    """
    from runtime_config import get_runtime_config
    cfg = get_runtime_config(session_key)

    endpoint = str(cfg.get("llm_endpoint", "") or "").strip()
    model = str(cfg.get("llm_model", "") or "gpt-4o-mini").strip()
    max_tokens = int(cfg.get("llm_max_tokens", 1024) or 1024)
    api_key = str(cfg.get("llm_api_key", "") or "").strip()

    if not endpoint:
        raise ValueError(
            "LLM endpoint not configured. Go to Query Tester > Setup."
        )
    if not api_key:
        raise ValueError(
            "LLM API key not configured. Go to Query Tester > Setup."
        )

    return {
        "endpoint": endpoint,
        "model": model,
        "max_tokens": min(max_tokens, MAX_RESPONSE_TOKENS),
        "api_key": api_key,
    }


# ── LLM Call ─────────────────────────────────────────────────────────────────


def _call_llm(llm_cfg, system_prompt, user_message):
    # type: (dict, str, str) -> str
    """Single HTTPS POST to the LLM endpoint. No Splunk queries executed."""
    try:
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError, URLError
    except ImportError:
        from urllib2 import Request, urlopen, HTTPError, URLError

    body = json.dumps({
        "model": llm_cfg["model"],
        "max_tokens": llm_cfg["max_tokens"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }).encode("utf-8")

    req = Request(llm_cfg["endpoint"], data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + llm_cfg["api_key"])

    ctx = ssl._create_unverified_context()
    try:
        resp = urlopen(req, timeout=LLM_TIMEOUT_SECS, context=ctx)
        data = json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")[:200]
        raise ValueError("LLM HTTP {0}: {1}".format(exc.code, err))
    except URLError as exc:
        raise ValueError("Cannot reach LLM: {0}".format(exc.reason))

    choice = (data.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content", "")
    if not content:
        content = data.get("content", "") or data.get("output", "") or ""
    return content or "(no response from AI)"


# ── Rate Limit (Dispatch History via HTTP) ───────────────────────────────────


def _should_skip_scheduled(session_key, saved_search_name):
    # type: (str, str) -> bool
    """Check if this scheduled search ran less than 10 min ago.
    Uses Splunk REST API (HTTP) to read dispatch history — no KVStore.
    Returns True if we should skip the LLM call.
    """
    if not saved_search_name or not session_key:
        return False
    try:
        import config as cfg
        import datetime
        from splunklib import client as splunk_client

        service = splunk_client.Service(
            token=session_key,
            host=cfg.SPLUNK_HOST,
            port=cfg.SPLUNK_PORT,
            scheme=cfg.SPLUNK_SCHEME,
            app="QueryTester",
            owner="nobody",
        )
        ss = service.saved_searches[saved_search_name]
        # history() returns Job objects (Entity subclass).
        # Access fields via job["key"], NOT job.get() — Entity has
        # no .get() method.
        jobs = ss.history()
        if len(jobs) < 2:
            return False  # first or second run — always call LLM
        # jobs[0] = current run, jobs[1] = previous run
        prev = jobs[1]
        try:
            dispatch_time = prev["published"] or ""
        except (KeyError, AttributeError):
            return False
        if not dispatch_time:
            return False
        # Parse ISO time: "2026-05-05T14:30:00.000+00:00"
        clean = str(dispatch_time).split(".")[0].replace("T", " ")
        dt = datetime.datetime.strptime(clean, "%Y-%m-%d %H:%M:%S")
        age_secs = (datetime.datetime.utcnow() - dt).total_seconds()
        if age_secs < MIN_INTERVAL_SECS:
            return True
    except Exception:
        pass
    return False


# ── Table Formatter ──────────────────────────────────────────────────────────


def _format_table(rows):
    # type: (list) -> str
    """Format rows as a compact markdown table for the LLM prompt."""
    if not rows:
        return "(no data)"
    subset = rows[:MAX_ROWS_FOR_AI]
    keys = [
        k for k in subset[0].keys()
        if not k.startswith("_") or k == "_time"
    ]
    if not keys:
        keys = list(subset[0].keys())[:MAX_COLS_FOR_AI]
    keys = keys[:MAX_COLS_FOR_AI]

    header = "| " + " | ".join(keys) + " |"
    sep = "| " + " | ".join("---" for _ in keys) + " |"
    lines = []
    for row in subset:
        cells = []
        for k in keys:
            val = str(row.get(k, ""))
            if len(val) > MAX_CELL_LEN:
                val = val[:MAX_CELL_LEN - 3] + "..."
            cells.append(val)
        lines.append("| " + " | ".join(cells) + " |")

    return header + "\n" + sep + "\n" + "\n".join(lines)


# ── Command ──────────────────────────────────────────────────────────────────


@Configuration()
class AiGuyCommand(StreamingCommand):
    """Ask AI about your query results.

    ##Syntax

    .. code-block::
        aiguy prompt=<string> [field=<string>] [value=<string>] [mode=<string>]

    ##Description

    Collects upstream results, sends a sample to an LLM with your question,
    and adds ``ai_answer``, ``aiguy_timestamp``, ``aiguy_source`` fields to
    every output row. The command is purely read-only — it never executes
    SPL or modifies any Splunk data.

    ##Options

    prompt
        Your question about the data (required unless mode is set).
    mode
        Preset analysis: summary, anomaly, trend, compare, alert, health, top.
    field
        Focus the AI on a specific field name.
    value
        Filter: only rows where ``field`` equals this value are sent to AI.

    ##Example

    .. code-block::
        index=main | stats count by host | aiguy prompt="which host is busiest?"
        index=main | stats count by status | aiguy mode="anomaly"
        index=main | aiguy mode="alert" field="status" value="Error"
    """

    prompt = Option(
        doc="The question to ask the AI",
        require=False, default=None,
    )
    mode = Option(
        doc="Preset: summary, anomaly, trend, compare, alert, health, top",
        require=False, default=None,
    )
    field = Option(
        doc="Focus on a specific field name",
        require=False, default=None,
    )
    value = Option(
        doc="Filter rows where field equals this value",
        require=False, default=None,
    )

    def stream(self, records):
        # ── 1. Resolve the effective prompt ──────────────────────────────
        effective_prompt = self.prompt or ""
        if self.mode:
            mode_key = self.mode.strip().lower()
            effective_prompt = MODE_PROMPTS.get(
                mode_key,
                "Analyze the data with focus on: " + self.mode,
            )
        if not effective_prompt:
            effective_prompt = MODE_PROMPTS["summary"]

        # ── 2. Collect all upstream rows ─────────────────────────────────
        collected = []
        for record in records:
            collected.append(dict(record))
        if not collected:
            return

        # ── 3. Apply field/value focus filter ────────────────────────────
        focus_note = ""
        if self.field and self.value is not None:
            f = self.field.strip()
            v = self.value.strip()
            filtered = [
                r for r in collected
                if str(r.get(f, "")).strip().lower() == v.lower()
            ]
            analysis_rows = filtered if filtered else collected
            focus_note = (
                "The user is focused on rows where {0}={1} "
                "({2} of {3} rows match)."
            ).format(f, v, len(filtered), len(collected))
        elif self.field:
            analysis_rows = collected
            focus_note = (
                "The user is specifically interested in the "
                "'{0}' field."
            ).format(self.field.strip())
        else:
            analysis_rows = collected

        # ── 4. Read search metadata ─────────────────────────────────────
        full_spl = ""
        sid = ""
        session_key = ""
        try:
            full_spl = self._metadata.searchinfo.search or ""
            sid = self._metadata.searchinfo.sid or ""
            session_key = self._metadata.searchinfo.session_key or ""
        except Exception:
            pass

        # Extract saved search name from scheduler SID
        saved_search = ""
        if sid.startswith("scheduler__"):
            parts = sid.split("__")
            if len(parts) >= 2:
                saved_search = parts[1]

        # ── 5. Rate limit for scheduled searches (HTTP, no KVStore) ──────
        if saved_search:
            if _should_skip_scheduled(session_key, saved_search):
                ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
                for row in collected:
                    row["ai_answer"] = (
                        "(aiguy skipped — last run was less "
                        "than 10 minutes ago)"
                    )
                    row["aiguy_timestamp"] = ts
                    row["aiguy_source"] = "rate-limited"
                    yield row
                return

        # ── 6. Get LLM config (from runtime_config, cached 120s) ────────
        try:
            llm_cfg = _get_llm_config(session_key)
        except Exception as exc:
            ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
            for row in collected:
                row["ai_answer"] = "AI error: {0}".format(str(exc))
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = "error"
                yield row
            return

        # ── 7. Build LLM prompt ──────────────────────────────────────────
        table = _format_table(analysis_rows)
        total = len(analysis_rows)
        shown = min(total, MAX_ROWS_FOR_AI)

        msg_parts = ["Question: " + effective_prompt]
        if focus_note:
            msg_parts.append("Focus: " + focus_note)
        msg_parts.append(
            "Full SPL query:\n```\n{0}\n```".format(
                full_spl or "(not available)"
            )
        )
        if total > MAX_ROWS_FOR_AI:
            msg_parts.append(
                "Query results (showing {0} of {1} total rows):\n{2}"
                .format(shown, total, table)
            )
        else:
            msg_parts.append(
                "Query results ({0} rows):\n{1}".format(total, table)
            )
        user_msg = "\n\n".join(msg_parts)

        # ── 8. Call LLM ──────────────────────────────────────────────────
        try:
            answer = _call_llm(llm_cfg, SYSTEM_PROMPT, user_msg)
            source = "live"
        except Exception as exc:
            answer = "AI error: {0}".format(str(exc))
            source = "error"

        # ── 9. Yield ALL original rows with AI fields ────────────────────
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        for row in collected:
            row["ai_answer"] = answer
            row["aiguy_timestamp"] = ts
            row["aiguy_source"] = source
            yield row


dispatch(AiGuyCommand, sys.argv, sys.stdin, sys.stdout, __name__)
