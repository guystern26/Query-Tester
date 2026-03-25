# spec-16 — Backend Module Map

## Entry Points

| Module | Trigger | Role |
|--------|---------|------|
| `query_tester.py` | REST request | Main handler. Routes sub-paths (`/config/*`, `/command_policy/*`) |
| `alert_run_test.py` | Splunk alert action | Runs a scheduled test by ID |
| `scheduled_runner.py` | Scripted input (60s) | Checks cron schedules, runs due tests |

## REST Handlers

| Module | Path | Purpose |
|--------|------|---------|
| `config_handler.py` | `/config/*` | Setup page config CRUD, auto-detect, connectivity test |
| `command_policy_handler.py` | `/command_policy/*` | Dangerous command policy CRUD |
| `saved_tests_handler.py` | `/data/saved_tests` | Saved test CRUD with ownership |
| `scheduled_tests_handler.py` | `/data/scheduled_tests` | Schedule CRUD + saved search management |
| `run_history_handler.py` | `/data/test_run_history` | Run history retrieval |
| `bug_report_handler.py` | `/data/tester` (sub-path) | Bug report email sending |

## Core

| Module | Responsibility |
|--------|----------------|
| `test_runner.py` | Orchestrator — loops scenarios, coordinates all phases |
| `payload_parser.py` | JSON dict to dataclasses (camelCase to snake_case) |
| `response_builder.py` | Serializes results to camelCase JSON |
| `models.py` | Dataclass definitions |
| `helpers.py` | Shared utilities |
| `validation_parser.py` | Parses validation conditions from payload |

## SPL Pipeline

| Module | Boundary |
|--------|----------|
| `spl_analyzer.py` | Reads SPL only — never modifies |
| `spl_analyzer_rules.py` | Analysis rule definitions |
| `query_injector.py` | Rewrites SPL — never runs it |
| `query_executor.py` | Executes SPL via splunklib |
| `spl_normalizer.py` | SPL preprocessing before analysis |
| `preflight.py` | Pre-run SPL validation |

## Data

| Module | Role |
|--------|------|
| `data_indexer.py` | Index events via HEC, cleanup via SPL delete |
| `lookup_manager.py` | Temp CSV lookup create/delete |
| `sub_query_runner.py` | Executes sub-queries for query_data input mode |

## Generators

`event_generator.py` — expands GeneratorConfig. No file I/O, no Splunk calls.
Type modules: `numbered.py`, `pick_list.py`, `email.py`, `ip_address.py`,
`unique_id.py`, `random_number.py`, `general_field.py`. Parser: `config_parser.py`.

## Validation

| Module | Boundary |
|--------|----------|
| `result_validator.py` | Compares rows to conditions — never runs queries |
| `condition_handlers.py` | Registry of condition evaluation functions |
| `scope_evaluator.py` | Evaluates scope-level conditions |

## Config Stack

| Module | Role |
|--------|------|
| `config.py` | Static defaults (constants, never KVStore) |
| `runtime_config.py` | KVStore + cache (120s TTL), falls back to config.py |
| `config_detection.py` | Auto-detects Splunk settings for Setup page |
| `config_secrets.py` | Reads/writes `storage/passwords` (uses static config directly) |
| `config_test_connectivity.py` | Tests HEC and SMTP connectivity |

## Auth & Connection

| Module | Role |
|--------|------|
| `auth_utils.py` | Role-based auth via `authentication/current-context` |
| `handler_utils.py` | Session/username extraction, JSON responses, `is_admin_user()` |
| `splunk_connect.py` | `get_service(session_key)` — always localhost |
| `kvstore_client.py` | Raw KVStore CRUD (uses static config — circular dependency anchor) |

## Scheduling

| Module | Role |
|--------|------|
| `scheduled_runner.py` | Cron loop, runs due tests, writes history, sends emails |
| `scheduled_runner_helpers.py` | Helper functions for scheduled runner |
| `scheduled_search_manager.py` | Creates/updates/deletes backing Splunk saved searches |
| `cron_matcher.py` | `cron_matches(expr, dt_tuple)`, `is_enabled(record)` |
| `spl_drift.py` | Compares current SPL against last passed run |

## Email

| Module | Role |
|--------|------|
| `alert_email.py` | Email building and SMTP delivery |
| `alert_email_html.py` | HTML email template rendering |
| `alert_helpers.py` | Shared email helper functions |

## Infrastructure

| Module | Role |
|--------|------|
| `logger.py` | File-based logging with `reconfigure_log_level()` |
| `deprecation.py` | Deprecation warning utilities |
