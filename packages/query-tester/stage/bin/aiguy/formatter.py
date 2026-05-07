from __future__ import annotations

from .constants import (
    MAX_ROWS_FOR_AI,
    MAX_COLS_FOR_AI,
    MAX_CELL_LEN,
    MAX_PROMPT_CHARS,
)


def clean_llm_response(raw):
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


def _estimate_unique_count(rows, keys, focus_field):
    # type: (list, list, str) -> int
    """Quick count of unique rows (capped at MAX_ROWS_FOR_AI)."""
    seen = set()  # type: set
    for row in rows:
        if focus_field:
            key = str(row.get(focus_field, ""))
        else:
            key = "|".join(str(row.get(k, "")) for k in keys)
        seen.add(key)
        if len(seen) >= MAX_ROWS_FOR_AI:
            break
    return len(seen)


def format_table(rows, focus_field=None, char_budget=0):
    # type: (list, str, int) -> str
    """Format rows as a compact markdown table for the LLM prompt.

    Deduplicates by focus_field (or all visible columns), then adds
    rows until the char budget is reached.
    Cell length is dynamic: fewer rows = more chars per cell.
    """
    if not rows:
        return "(no data)"
    budget = char_budget or MAX_PROMPT_CHARS

    # Pick visible columns
    _KEEP = {"_time", "_raw"}
    keys = [
        k for k in rows[0].keys()
        if not k.startswith("_") or k in _KEEP
    ]
    if not keys:
        keys = list(rows[0].keys())[:MAX_COLS_FOR_AI]
    keys = keys[:MAX_COLS_FOR_AI]

    # Dynamic cell length: fewer unique rows = more room per cell
    unique_est = _estimate_unique_count(rows, keys, focus_field)
    if unique_est <= 3:
        cell_limit = 2000  # full tracebacks, long messages
    elif unique_est <= 10:
        cell_limit = 500   # decent context per cell
    else:
        cell_limit = MAX_CELL_LEN  # 80 — keep it compact

    header = "| " + " | ".join(keys) + " |"
    sep = "| " + " | ".join("---" for _ in keys) + " |"
    used = len(header) + len(sep) + 2

    # Dedup + budget-aware row selection
    lines = []
    seen = set()  # type: set
    for row in rows:
        if focus_field:
            dedup_key = str(row.get(focus_field, ""))
        else:
            dedup_key = "|".join(str(row.get(k, "")) for k in keys)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        cells = []
        for k in keys:
            val = str(row.get(k, ""))
            if len(val) > cell_limit:
                val = val[:cell_limit - 3] + "..."
            cells.append(val)
        line = "| " + " | ".join(cells) + " |"

        if used + len(line) + 1 > budget:
            break
        lines.append(line)
        used += len(line) + 1
        if len(lines) >= MAX_ROWS_FOR_AI:
            break

    return header + "\n" + sep + "\n" + "\n".join(lines)


def trim_values_to_budget(values, budget=0):
    # type: (list, int) -> list
    """Trim a list of string values to fit within a char budget."""
    limit = budget or MAX_PROMPT_CHARS
    result = []
    used = 2  # for JSON brackets []
    for val in values:
        entry_len = len(val) + 4
        if used + entry_len > limit:
            break
        result.append(val)
        used += entry_len
    return result
