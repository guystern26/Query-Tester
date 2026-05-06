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

Modes:
    - Analysis modes (summary, anomaly, trend, compare, alert, health, top):
      One LLM call, same ai_answer on every row.
    - Extract mode (mode="extract"):
      AI generates a Python regex; applied locally to ALL rows.
      Falls back to dict mapping if regex fails or match rate < 50%.
      Adds a new field (new_field_name) with per-row extracted values.

Usage:
    ... | aiguy prompt="which sourcetype has the most events?"
    ... | aiguy mode="anomaly"
    ... | aiguy mode="alert" field="action" value="blocked"
    ... | aiguy mode="extract" field="email" prompt="extract the domain" new_field_name="domain"

Requires: Splunk 9.2+, LLM configured in Query Tester setup page.
"""
from __future__ import annotations

import json
import os
import re
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
MAX_UNIQUE_FOR_DICT = 100  # max unique values sent to LLM for dict extraction
MAX_SAMPLE_FOR_REGEX = 15  # sample values sent to LLM for regex generation
MIN_REGEX_MATCH_RATE = 0.5  # fall back to dict if regex matches less than 50%

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

EXTRACT_REGEX_PROMPT = (
    "You are a regex generator for Splunk field extraction. "
    "Given sample values from a data field and a user description of what "
    "to extract, return ONLY a JSON object with two keys:\n"
    '- "regex": a Python-compatible regular expression with a single '
    "named capture group (?P<result>...)\n"
    '- "field_name": a short, snake_case field name for the extracted value '
    "(inferred from the user's description)\n\n"
    "No explanation, no markdown. ONLY valid JSON on a single line.\n"
    'Example: {"regex": "(?P<result>(?<=@)[\\\\w.-]+)", "field_name": "domain"}'
)

EXTRACT_DICT_PROMPT = (
    "You are a data extraction engine for Splunk. "
    "Given a list of field values and a description of what to extract "
    "from each, return ONLY a JSON object with two keys:\n"
    '- "field_name": a short, snake_case field name for the extracted value '
    "(inferred from the user's description)\n"
    '- "mapping": an object mapping each input value to its extracted result. '
    "If a value has nothing to extract, map it to an empty string.\n\n"
    "No explanation, no markdown fences. ONLY valid JSON.\n"
    'Example: {"field_name": "domain", "mapping": {"a@b.com": "b.com"}}'
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
    """Read LLM settings from runtime_config (cached, 120s TTL)."""
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
    """Single HTTPS POST to the LLM endpoint."""
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
    """Check if this scheduled search ran less than 10 min ago."""
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
        jobs = ss.history()
        if len(jobs) < 2:
            return False
        prev = jobs[1]
        try:
            dispatch_time = prev["published"] or ""
        except (KeyError, AttributeError):
            return False
        if not dispatch_time:
            return False
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


# ── Extract Mode ─────────────────────────────────────────────────────────────


def _clean_llm_response(raw):
    # type: (str) -> str
    """Strip markdown fences, quotes, and whitespace from LLM output."""
    clean = raw.strip().strip('"').strip("'")
    if clean.startswith("```"):
        inner = clean[3:]
        if inner.startswith("\n"):
            inner = inner[1:]
        elif "\n" in inner:
            inner = inner.split("\n", 1)[1]
        clean = inner.rsplit("```", 1)[0].strip()
    return clean.strip("`")


def _try_regex_extract(regex_str, rows, field_name):
    # type: (str, list, str) -> tuple
    """Apply a regex to all rows. Returns (val_to_extracted, match_rate)."""
    clean = _clean_llm_response(regex_str)
    try:
        pattern = re.compile(clean)
    except re.error:
        return {}, 0.0

    results = {}  # type: dict
    matched = 0
    total = 0
    for row in rows:
        val = str(row.get(field_name, ""))
        if not val:
            continue
        if val in results:
            matched += 1
            total += 1
            continue
        total += 1
        m = pattern.search(val)
        if m:
            try:
                results[val] = m.group("result")
                matched += 1
            except IndexError:
                if m.lastindex and m.lastindex >= 1:
                    results[val] = m.group(1)
                    matched += 1

    rate = matched / total if total > 0 else 0.0
    return results, rate


def _try_dict_extract(dict_response, rows, field_name):
    # type: (str, list, str) -> dict
    """Parse a JSON dict response and map values. Returns val_to_extracted."""
    clean = _clean_llm_response(dict_response)
    try:
        mapping = json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return {}
    if not isinstance(mapping, dict):
        return {}
    results = {}
    for row in rows:
        val = str(row.get(field_name, ""))
        if val in mapping:
            results[val] = str(mapping[val])
    return results


def _parse_regex_response(raw):
    # type: (str) -> tuple
    """Parse LLM regex response. Returns (regex_str, suggested_field_name)."""
    clean = _clean_llm_response(raw)
    try:
        obj = json.loads(clean)
        if isinstance(obj, dict):
            return (
                str(obj.get("regex", "")),
                str(obj.get("field_name", "")),
            )
    except (json.JSONDecodeError, ValueError):
        pass
    # Fallback: treat entire response as raw regex, no field name
    return clean, ""


def _parse_dict_response(raw):
    # type: (str) -> tuple
    """Parse LLM dict response. Returns (mapping_dict, suggested_field_name)."""
    clean = _clean_llm_response(raw)
    try:
        obj = json.loads(clean)
        if isinstance(obj, dict):
            field_name = str(obj.get("field_name", ""))
            mapping = obj.get("mapping", obj)
            # If the response has "field_name" + "mapping", use mapping
            # Otherwise the entire obj is the mapping (legacy format)
            if "mapping" in obj and isinstance(mapping, dict):
                return mapping, field_name
            # Remove the field_name key from mapping if it leaked in
            mapping_copy = dict(obj)
            mapping_copy.pop("field_name", None)
            return mapping_copy, field_name
    except (json.JSONDecodeError, ValueError):
        pass
    return {}, ""


def _run_extract(llm_cfg, collected, field_name, user_prompt, user_field_name):
    # type: (dict, list, str, str, str) -> tuple
    """Run extract mode: regex first, dict fallback.
    LLM suggests a field name; user_field_name overrides if provided.
    Returns (collected_with_new_field, source_str, ai_answer_str).
    """
    # Gather unique values of the source field
    unique_vals = []
    seen = set()  # type: set
    for row in collected:
        val = str(row.get(field_name, ""))
        if val and val not in seen:
            seen.add(val)
            unique_vals.append(val)

    if not unique_vals:
        new_field = user_field_name or "extracted"
        for row in collected:
            row[new_field] = ""
        return collected, "error", "No values found in field '{0}'".format(
            field_name
        )

    # ── Step 1: Ask LLM for a regex + field name ─────────────────────
    sample = unique_vals[:MAX_SAMPLE_FOR_REGEX]
    regex_msg = (
        "Field name: {field}\n"
        "User request: {prompt}\n"
        "Sample values:\n{values}"
    ).format(
        field=field_name,
        prompt=user_prompt,
        values="\n".join("- " + v for v in sample),
    )

    regex_response = ""
    regex_str = ""
    llm_field_name = ""
    try:
        regex_response = _call_llm(llm_cfg, EXTRACT_REGEX_PROMPT, regex_msg)
        regex_str, llm_field_name = _parse_regex_response(regex_response)
    except Exception:
        pass

    # Resolve field name: user override > LLM suggestion > "extracted"
    new_field = user_field_name or llm_field_name or "extracted"
    # Sanitize: only allow word chars and underscores
    new_field = re.sub(r"[^\w]", "_", new_field).strip("_") or "extracted"

    # ── Step 2: Try applying the regex ───────────────────────────────
    results = {}  # type: dict
    source = "regex"
    match_rate = 0.0

    if regex_str:
        results, match_rate = _try_regex_extract(
            regex_str, collected, field_name
        )

    # ── Step 3: Fall back to dict if regex failed ────────────────────
    if match_rate < MIN_REGEX_MATCH_RATE:
        dict_vals = unique_vals[:MAX_UNIQUE_FOR_DICT]
        dict_msg = (
            "Field name: {field}\n"
            "User request: {prompt}\n"
            "Values to extract from:\n{values}\n\n"
            "Return a JSON object with field_name and mapping."
        ).format(
            field=field_name,
            prompt=user_prompt,
            values=json.dumps(dict_vals),
        )
        try:
            dict_response = _call_llm(
                llm_cfg, EXTRACT_DICT_PROMPT, dict_msg
            )
            mapping, dict_field_name = _parse_dict_response(dict_response)
            dict_results = _try_dict_extract(
                json.dumps(mapping), collected, field_name
            )
            if dict_results:
                results = dict_results
                source = "dict"
                # Use dict field name if regex didn't provide one
                if not user_field_name and dict_field_name and not llm_field_name:
                    new_field = re.sub(r"[^\w]", "_", dict_field_name).strip("_") or "extracted"
        except Exception:
            pass

    if not results:
        source = "error"

    # ── Step 4: Apply results to all rows ────────────────────────────
    extracted_count = 0
    for row in collected:
        val = str(row.get(field_name, ""))
        extracted = results.get(val, "")
        row[new_field] = extracted
        if extracted:
            extracted_count += 1

    answer = "Extracted '{new}' from '{src}' using {method} ({n}/{total} rows)".format(
        new=new_field,
        src=field_name,
        method=source,
        n=extracted_count,
        total=len(collected),
    )
    if source == "regex" and regex_str:
        answer += " | pattern: " + _clean_llm_response(regex_str)

    return collected, source, answer


# ── Command ──────────────────────────────────────────────────────────────────


@Configuration()
class AiGuyCommand(StreamingCommand):
    """Ask AI about your query results.

    ##Syntax

    .. code-block::
        aiguy prompt=<string> [field=<string>] [value=<string>] [mode=<string>] [new_field_name=<string>]

    ##Description

    Collects upstream results, sends a sample to an LLM with your question,
    and adds ``ai_answer``, ``aiguy_timestamp``, ``aiguy_source`` fields to
    every output row. The command is purely read-only — it never executes
    SPL or modifies any Splunk data.

    **Extract mode** (mode="extract"): AI generates a regex to extract a
    value from each row's field. Falls back to dict mapping if regex fails.
    Adds a new field (new_field_name) with per-row extracted values.

    ##Options

    prompt
        Your question about the data (required unless mode is set).
    mode
        Preset analysis: summary, anomaly, trend, compare, alert, health, top, extract.
    field
        Focus the AI on a specific field name. Required for extract mode.
    value
        Filter: only rows where ``field`` equals this value are sent to AI.
    new_field_name
        Name of the new field to create (extract mode only). Default: "extracted".

    ##Example

    .. code-block::
        index=main | stats count by host | aiguy prompt="which host is busiest?"
        index=main | stats count by status | aiguy mode="anomaly"
        index=main | aiguy mode="extract" field="user" prompt="extract the domain from the email" new_field_name="domain"
    """

    prompt = Option(
        doc="The question to ask the AI",
        require=False, default=None,
    )
    mode = Option(
        doc="Preset: summary, anomaly, trend, compare, alert, health, top, extract",
        require=False, default=None,
    )
    field = Option(
        doc="Focus on a specific field name (required for extract mode)",
        require=False, default=None,
    )
    value = Option(
        doc="Filter rows where field equals this value",
        require=False, default=None,
    )
    new_field_name = Option(
        doc="Name of the new extracted field (extract mode). AI suggests one if omitted.",
        require=False, default=None,
    )

    def stream(self, records):
        # ── 1. Collect all upstream rows ─────────────────────────────────
        collected = []
        for record in records:
            collected.append(dict(record))
        if not collected:
            return

        # ── 2. Read search metadata ─────────────────────────────────────
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

        # ── 3. Rate limit for scheduled searches ────────────────────────
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

        # ── 4. Get LLM config ───────────────────────────────────────────
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

        # ── 5. Check for extract mode ───────────────────────────────────
        mode_key = (self.mode or "").strip().lower()

        if mode_key == "extract":
            field_name = (self.field or "").strip()
            if not field_name:
                ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
                for row in collected:
                    row["ai_answer"] = (
                        "Extract mode requires field= parameter. "
                        "Example: | aiguy mode=\"extract\" field=\"email\" "
                        "prompt=\"extract the domain\" "
                        "new_field_name=\"domain\""
                    )
                    row["aiguy_timestamp"] = ts
                    row["aiguy_source"] = "error"
                    yield row
                return

            user_prompt = self.prompt or "extract the value"
            new_field = (self.new_field_name or "extracted").strip()

            try:
                collected, source, answer = _run_extract(
                    llm_cfg, collected, field_name, user_prompt, new_field
                )
            except Exception as exc:
                answer = "Extract error: {0}".format(str(exc))
                source = "error"

            ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
            for row in collected:
                if source == "error":
                    row["ai_answer"] = answer
                row["aiguy_timestamp"] = ts
                row["aiguy_source"] = source
                yield row
            return

        # ── 6. Normal analysis mode ─────────────────────────────────────
        effective_prompt = self.prompt or ""
        if mode_key:
            effective_prompt = MODE_PROMPTS.get(
                mode_key,
                "Analyze the data with focus on: " + self.mode,
            )
        if not effective_prompt:
            effective_prompt = MODE_PROMPTS["summary"]

        # Apply field/value focus filter
        focus_note = ""
        analysis_rows = collected
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
            focus_note = (
                "The user is specifically interested in the "
                "'{0}' field."
            ).format(self.field.strip())

        # Build LLM prompt
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

        # Call LLM
        try:
            answer = _call_llm(llm_cfg, SYSTEM_PROMPT, user_msg)
            source = "live"
        except Exception as exc:
            answer = "AI error: {0}".format(str(exc))
            source = "error"

        # Yield all rows with AI fields
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        for row in collected:
            row["ai_answer"] = answer
            row["aiguy_timestamp"] = ts
            row["aiguy_source"] = source
            yield row


dispatch(AiGuyCommand, sys.argv, sys.stdin, sys.stdout, __name__)
