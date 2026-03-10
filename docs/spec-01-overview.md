# 01 — Overview & File Structure

## Purpose

The backend receives a test payload from the React frontend, injects the user's input data into Splunk, runs the modified SPL query once **per scenario**, validates the results against that scenario's validation config, and returns a structured response.

---

## All Files Live In

```
packages/playground/stage/bin/
```

## File Map

```
bin/
├── query_tester.py        ← Splunk REST handler entry point
├── test_runner.py         ← Orchestrator: loops scenarios, coordinates all modules
├── payload_parser.py      ← Raw JSON dict → typed Python dataclasses
├── spl_analyzer.py        ← SPL warnings, unauthorized/unusual command detection
├── query_injector.py      ← SPL string rewriting (index redirect, lookup swap)
├── data_indexer.py        ← Index events into Splunk temp index via makeresults+collect
├── lookup_manager.py      ← Temp CSV lookup file create/delete
├── query_executor.py      ← Execute SPL via splunklib, return rows as List[dict]
├── result_validator.py    ← Validate result rows against ValidationConfig
├── event_generator.py     ← Expand GeneratorConfig into synthetic event list
└── logger.py              ← File-based logger — NEVER stdout
```

## Module Responsibilities (strict — do not mix)

| File | Does | Does NOT |
|---|---|---|
| `query_tester.py` | HTTP wiring only | Business logic |
| `test_runner.py` | Orchestrates scenario loop | Execute SPL or validate |
| `payload_parser.py` | Parse → dataclasses | Network calls |
| `spl_analyzer.py` | Inspect SPL text | Modify SPL |
| `query_injector.py` | Rewrite SPL strings | Run queries |
| `data_indexer.py` | Index events, cleanup | Validate results |
| `lookup_manager.py` | CSV file I/O | Run SPL |
| `query_executor.py` | Run SPL, return rows | Validate, inject |
| `result_validator.py` | Compare rows to conditions | Run queries |
| `event_generator.py` | Expand generator rules | File I/O |

---

## Python Constraints — Apply to Every File

- **Python 3.7** — `Optional[X]` not `X | None`, no walrus `:=`, no `match`
- **No external packages** — only stdlib + `splunklib` (closed network)
- **LF line endings only** — CRLF causes "can't start the script" 500 errors on Linux Splunk
- **No `print()` anywhere** — stdout corrupts Splunk REST handler responses
- `from __future__ import annotations` at the top of every file
- Shebang `#!/usr/bin/env python3` on `query_tester.py` only
