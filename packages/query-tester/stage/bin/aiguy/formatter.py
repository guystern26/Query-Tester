from __future__ import annotations

from .constants import MAX_ROWS_FOR_AI, MAX_COLS_FOR_AI, MAX_CELL_LEN


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


def format_table(rows, focus_field=None):
    # type: (list, str) -> str
    """Format rows as a compact markdown table for the LLM prompt."""
    if not rows:
        return "(no data)"
    if focus_field:
        subset = []
        seen = set()  # type: set
        for row in rows:
            val = str(row.get(focus_field, ""))
            if val not in seen:
                seen.add(val)
                subset.append(row)
                if len(subset) >= MAX_ROWS_FOR_AI:
                    break
    else:
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
