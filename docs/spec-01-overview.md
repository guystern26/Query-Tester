# 01 -- Backend Overview

## Purpose

The Splunk Query Tester backend is a set of Python REST handlers running inside Splunk's `splunkd` process. It receives test definitions from the React frontend, executes SPL queries against synthetic data, validates results, and returns structured responses.

## Entry Point

`query_tester.py` handles `POST /data/tester` and delegates sub-paths:

| Path | Handler |
|------|---------|
| `/data/tester` | `query_tester.py` (test execution) |
| `/data/tester/config/*` | `config_handler.py` (Setup page CRUD, auto-detection, connectivity tests) |
| `/data/tester/command_policy/*` | `command_policy_handler.py` (SPL command allow/block lists) |

Separate REST endpoints with their own `restmap.conf` entries:

| Path | Handler |
|------|---------|
| `/data/saved_tests` | `saved_tests_handler.py` (saved test CRUD) |
| `/data/scheduled_tests` | `scheduled_tests_handler.py` (schedule CRUD + saved search management) |
| `/data/test_run_history` | `run_history_handler.py` (run history records) |
| `/data/bug_report` | `bug_report_handler.py` (bug report submission) |

## Test Execution Flow

```
POST /data/tester with JSON payload
  -> payload_parser.py: JSON dict -> dataclasses (camelCase -> snake_case)
  -> spl_analyzer.py: read-only SPL analysis (structure, commands, fields)
  -> preflight.py: pre-execution checks
  -> per scenario:
       event_generator.py: expand GeneratorConfig into events (no I/O)
       data_indexer.py: index events via HEC + optional CSV lookups
       query_injector.py: rewrite SPL (index/sourcetype/time constraints)
       query_executor.py: execute modified SPL via splunklib
       result_validator.py: compare results against validation conditions
  -> cleanup (always in finally): delete indexed data + temp lookups
  -> response_builder.py: serialize results to camelCase JSON
```

Per-scenario errors are captured but don't stop the loop. Fatal errors only on parse or SPL failures.

## Module Organization

### `core/` -- Orchestration and Parsing
- `test_runner.py` -- orchestrator, loops scenarios
- `payload_parser.py` -- JSON dict -> dataclasses
- `response_builder.py` -- serializes results to camelCase
- `helpers.py` -- shared utilities
- `models.py` -- dataclass definitions
- `validation_parser.py` + `validation_parser_helpers.py` -- parse validation config

### `spl/` -- SPL Processing
- `spl_analyzer.py` -- reads SPL only, never modifies (+ `spl_analyzer_rules.py`)
- `query_injector.py` -- rewrites SPL, never runs it
- `query_executor.py` -- executes SPL via splunklib
- `spl_normalizer.py` -- SPL preprocessing before analysis
- `preflight.py` -- pre-execution checks

### `data/` -- Data Management
- `data_indexer.py` -- indexes events via HEC, cleanup via SPL delete
- `lookup_manager.py` -- temp CSV lookup create/delete
- `sub_query_runner.py` -- executes sub-queries for query_data inputs

### `generators/` -- Event Generation (no I/O, no Splunk calls)
- `event_generator.py` -- main generator with `GENERATOR_REGISTRY`
- `config_parser.py` -- parse generator config
- Per-type: `numbered.py`, `pick_list.py`, `email.py`, `ip_address.py`, `unique_id.py`, `random_number.py`, `general_field.py`

### `validation/` -- Result Validation (no queries)
- `result_validator.py` -- compares rows to conditions
- `condition_handlers.py` -- registry of condition evaluation functions
- `scope_evaluator.py` -- scope-based evaluation

### Top-level Modules
- `splunk_connect.py` -- `get_service(session_key)` factory, always localhost
- `runtime_config.py` -- KVStore config with 120s TTL cache
- `config.py` -- static defaults
- `config_secrets.py` -- reads/writes `storage/passwords`
- `config_detection.py` -- auto-detects Splunk settings for Setup page
- `config_test_connectivity.py` -- tests HEC and SMTP connectivity
- `kvstore_client.py` -- raw KVStore CRUD (get_all, get_by_id, upsert, delete)
- `handler_utils.py` -- shared handler utilities (session extraction, JSON responses)
- `auth_utils.py` -- role-based auth via `authentication/current-context`
- `logger.py` -- file-based logging with dynamic `reconfigure_log_level()`
- `alert_email.py` -- SMTP email delivery for test failures
- `alert_email_html.py` -- Outlook-compatible HTML email builder
- `alert_helpers.py` -- shared alert utilities
- `alert_run_test.py` -- custom alert action entry point
- `scheduled_runner.py` -- scripted input (every 60s via inputs.conf)
- `scheduled_runner_helpers.py` -- helper functions for scheduled runner
- `scheduled_search_manager.py` -- creates/updates/deletes backing Splunk saved searches
- `spl_drift.py` -- SPL drift detection (current vs last passed run)
- `cron_matcher.py` -- cron expression matching
- `deprecation.py` -- deprecation utilities

## Config Stack

```
config.py (static defaults -- rarely changed)
  -> runtime_config.py (KVStore "query_tester_config" override, 120s TTL cache)
    -> config_secrets.py (storage/passwords for sensitive values)
```

`runtime_config` layers: static defaults -> KVStore overrides -> storage/passwords secrets. Invalidated on Setup page save.

## Scheduled Execution

Two independent mechanisms:

1. **Alert action** (`alert_run_test.py`): Splunk saved search fires on cron -> triggers `query_tester_run_test` alert action. The saved search is created programmatically by `scheduled_tests_handler.py`.

2. **Scripted input** (`scheduled_runner.py`): Runs every 60s via `inputs.conf`. Checks `cron_matches()` against each enabled scheduled test. Runs due tests directly.

Both write to `test_run_history` KVStore and can send failure emails.

## Connection Rules

All modules use `splunk_connect.get_service(session_key)` -- always connects to localhost via static `config.py`. The `splunk_host` from Setup page is for display/URL purposes only.

**Exceptions** (circular dependency with `runtime_config`):
- `kvstore_client.py` -- uses static config directly
- `config_secrets.py` -- uses static config directly

Never add `runtime_config` imports to `splunk_connect.py`, `kvstore_client.py`, or `config_secrets.py`.
