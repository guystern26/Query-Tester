# BACKEND.md
# Splunk Query Tester — Backend Implementation Guide

Entry point for Cursor / Claude Code when implementing the Python backend.
Attach `spec-00-conventions.md` to **every** prompt. Attach the domain specs only for the relevant phase.

---

## What This Is

Python REST handler backend for a Splunk Enterprise custom app.

The React frontend (`utils/payloadBuilder.ts` → `buildPayload()`) sends a JSON payload to:
```
POST /splunkd/__raw/services/splunk_query_tester/query_tester
```

The backend:
1. Parses the JSON payload into typed Python dataclasses
2. Resolves the SPL (inline `query` field or saved search lookup)
3. For each scenario independently: generates events → indexes them → injects SPL → runs query → validates results → cleans up
4. Returns a structured JSON response the frontend renders in `ResultsPanel`

---

## Hard Constraints — Never Violate

```
Python 3.7         — Optional[X] not X | None. No walrus :=. No match statement.
No print()         — stdout corrupts Splunk REST responses. Use file logger only.
LF line endings    — CRLF causes 500 "can't start the script" on Linux Splunk.
No pip packages    — only stdlib + splunklib (closed network, no internet access).
from __future__ import annotations — first non-comment line in every file.
```

---

## File Structure

```
bin/
├── query_tester.py        ← REST handler entry point (Splunk wiring only)
├── test_runner.py         ← Orchestrator: loops over scenarios
├── payload_parser.py      ← JSON dict → typed Python dataclasses (camelCase → snake_case)
├── spl_analyzer.py        ← SPL inspection: unauthorized/unusual commands, warnings
├── query_injector.py      ← SPL string rewriting: index redirect, lookup swap
├── data_indexer.py        ← Index events into temp Splunk index via makeresults+collect
├── lookup_manager.py      ← Temp CSV lookup file create/delete
├── query_executor.py      ← Execute SPL via splunklib, return List[dict]
├── result_validator.py    ← Compare result rows against ValidationConfig
├── event_generator.py     ← Expand GeneratorConfig → flat event list
└── logger.py              ← File-based logger (/opt/splunk/var/log/splunk/query_tester.log)
```

---

## The Run Loop (Critical)

```
run_test(raw_payload)
  ├── parse payload once
  ├── resolve SPL once (same for all scenarios)
  ├── analyze SPL once (warnings)
  │
  └── for each scenario:                    ← INDEPENDENT — each gets its own run_id
        generate events from inputs
        index all events (tagged with run_id)
        inject SPL with this run_id
        run query ONCE
        validate ALL conditions (no short-circuit)
        cleanup in finally block             ← always runs
```

One query per scenario. All validation conditions evaluated regardless of pass/fail. Cleanup in `finally`.

---

## Spec Files

| File | What it covers | Attach for... |
|---|---|---|
| `docs/spec-00-conventions.md` | SOLID, Python 3.7 style, naming, error handling, registry pattern | **Every prompt** |
| `docs/spec-01-overview.md` | File map, module responsibilities | Setup |
| `docs/spec-02-entry-point.md` | `query_tester.py`, restmap.conf, Splunk handler wiring | Entry point phase |
| `docs/spec-03-payload.md` | **Full frontend payload contract**, camelCase→snake_case mapping, all dataclasses | Parser phase |
| `docs/spec-04-run-loop.md` | Scenario loop, concrete two-scenario example, SPL resolution, cleanup | Orchestrator phase |
| `docs/spec-05-spl-injection.md` | All injection strategies, edge cases, concrete before/after examples | Injector phase |
| `docs/spec-06-spl-analyzer.md` | Unauthorized/unusual commands, per-command warning messages | Analyzer phase |
| `docs/spec-07-response.md` | **Exact response keys** frontend reads, serialization helper, key reference table | Any phase |
| `docs/spec-08-event-generator.md` | 7 generator types, registry pattern, concrete expansion example | Generator phase |
| `docs/spec-09-data-indexer.md` | makeresults+collect SPL, single-quote avoidance, batching, lookup CSV | Indexer phase |
| `docs/spec-10-result-validator.md` | Condition registry, no short-circuit, concrete worked example | Validator phase |
| `docs/spec-11-executor-logger.md` | splunklib connection, result reading, file logger setup | Executor phase |

---

## Recommended Prompt Sequence

### Phase 1 — Foundation
Attach: `spec-00`, `spec-01`, `spec-03`
> Create `logger.py` and `payload_parser.py`. Implement all dataclasses using the exact camelCase→snake_case mapping in spec-03. Follow all conventions in spec-00.

### Phase 2 — SPL Logic
Attach: `spec-00`, `spec-05`, `spec-06`
> Create `spl_analyzer.py` and `query_injector.py`. Use the `STRATEGY_HANDLERS` / `CONDITION_HANDLERS` registry pattern from spec-00. Include all edge cases from spec-05.

### Phase 3 — Data Layer
Attach: `spec-00`, `spec-08`, `spec-09`
> Create `event_generator.py`, `data_indexer.py`, `lookup_manager.py`. Generator uses `GENERATOR_REGISTRY` pattern. Indexer uses JSON+eval method — never single quotes in SPL.

### Phase 4 — Execution + Validation
Attach: `spec-00`, `spec-10`, `spec-11`
> Create `result_validator.py` and `query_executor.py`. Validator uses `CONDITION_HANDLERS` dict. All conditions evaluated — no short-circuit.

### Phase 5 — Orchestration
Attach: `spec-00`, `spec-04`, `spec-07`
> Create `test_runner.py`. One query per scenario. Cleanup in `finally`. Response uses camelCase keys (see serialization helper in spec-07).

### Phase 6 — Entry Point
Attach: `spec-00`, `spec-02`, `spec-07`
> Create `query_tester.py`. Minimal — just wires Splunk's MConfigHandler to TestRunner.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Run granularity | One query per scenario | Each scenario's events indexed together, isolated by `run_id` |
| Validation | All conditions evaluated | No short-circuit — frontend shows the full list of pass/fail per scenario |
| rowIdentifier replacement | Full string replacement first, regex fallback | `"index=main sourcetype=fw"` must be replaced as a unit, not just `index=` |
| Subsearch brackets | Left untouched | `join [...]` / `append [...]` inner indexes run against real data intentionally |
| SPL data embedding | JSON via `eval _raw=` | Single quotes in SPL break silently; JSON double-quotes are safe |
| Response keys | camelCase | Frontend TypeScript interface uses camelCase — do not use `dataclasses.asdict()` |
| Error scope | Per-scenario only | One scenario failing does not stop others; fatal errors only on parse/SPL failures |
| Event generator | Built-in, no Eventgen app | Eventgen (splunkbase 1924) is a file-config continuous streamer — not suitable for on-demand test data |
