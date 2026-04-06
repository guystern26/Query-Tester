# 00 -- Python Code Conventions

These rules apply to every Python file in `packages/query-tester/stage/bin/`.

## Python 3.7 Compatibility

Splunk ships Python 3.7. The following are **banned**:

| Banned syntax | Use instead |
|--------------|-------------|
| `X \| None` | `Optional[X]` from `typing` |
| `:=` (walrus) | Separate assignment |
| `match/case` | if/elif or registry dict |
| `list[x]`, `dict[x, y]` | `List[x]`, `Dict[x, y]` from `typing` |
| `str.removeprefix()` | Slice: `s[len(prefix):]` |
| `d1 \| d2` (dict union) | `{**d1, **d2}` |

Every file must start with (after any docstring):
```python
from __future__ import annotations
```

## No print() -- Ever

`print()` writes to stdout, which **corrupts Splunk REST handler responses**. Use:
```python
from logger import get_logger
logger = get_logger(__name__)
logger.info("message")
```

## LF Line Endings Only

CRLF causes `500 "can't start the script"` on Linux Splunk. Configure editors to save LF.

## No External Packages

Only `stdlib` + bundled `splunklib`. No pip installs -- closed network environment.

## File Structure

- **Under 200 lines** per module. Single responsibility.
- **One `PersistentServerConnectionApplication` class per handler file.** Multiple classes in one file = "can't start the script".
- `from __future__ import annotations` as the first import line.

## Naming

- `snake_case` in Python code.
- `camelCase` in JSON responses (frontend expectation).
- Translation between the two happens only in `_to_dict()` methods and the API layer.
- No `dataclasses.asdict()` -- it produces snake_case. Use explicit `_to_dict()`.

## Error Handling

- `try/except` around every KVStore operation.
- Correct HTTP codes: `400` (validation), `403` (forbidden), `404` (not found), `409` (version conflict), `500` (internal).
- Cleanup always in `finally` -- even when exceptions are thrown.
- All validation conditions evaluated -- no short-circuit on first failure.
- Per-scenario errors don't stop the test loop. Fatal errors only on parse/SPL failures.

## Registries Over Conditionals

Use registry dicts, not if/elif chains:
- `GENERATOR_REGISTRY` in `generators/event_generator.py`
- `CONDITION_HANDLERS` in `validation/condition_handlers.py`
- `STRATEGY_HANDLERS` in validation

## Splunk Connections

**Always** use `splunk_connect.get_service(session_key)` -- connects to localhost via static `config.py`.

**Two exceptions** (circular dependency with `runtime_config`):
1. `kvstore_client.py` -- runtime_config is stored in KVStore
2. `config_secrets.py` -- called by `runtime_config._read_secrets()`

Never add `runtime_config` imports to these three modules.

## Session & Auth

- `session_key` injected at construction or passed as parameter. Never a global.
- `createdBy` always from session token (`session["user"]`), never from request body.
- Admin check: `auth_utils.is_admin(session_key)` reads roles from session token (SAML-safe).
- Ownership enforcement: handlers compare `createdBy` against session user on PUT/DELETE. Admins bypass.

## KVStore Booleans

KVStore converts Python booleans to strings `"1"`/`"0"`. JavaScript `"0"` is truthy.

Always normalize explicitly:
```python
alert_flag in (True, "1", "true", "True")  # not bare truthiness
```

Backend handlers use `_normalize_bools()` on GET/PUT responses.

## Optimistic Locking

`saved_tests` and `scheduled_tests` use a `version` integer field:
- Born at `1` on POST.
- PUT: compare payload version against stored version. Mismatch -> `409 Conflict`.
- On match: increment to `existing_version + 1`.
- Legacy records (version=0 or missing): check skipped, version set to `1`.

## web.conf Expose Entries

`restmap.conf` prefix-matches (e.g., `match = /data/tester` catches `/data/tester/config/status`).
`web.conf` expose patterns do **NOT** prefix-match -- each sub-path needs its own entry.

Every time a new sub-path is added to a handler, a matching `web.conf` expose entry **must** be added, or the Splunk web proxy returns 404.

## SPL Data Embedding

No single quotes in SPL eval expressions -- they break silently. Use JSON with double-quote escaping via `eval _raw=`.

## Handler Return Values

All handler return values are plain `dict` or `list[dict]`. No dataclasses or custom objects in responses.

## Splunk REST Response Format

When reading Splunk REST API responses:
```python
data = response.json()
content = data['entry'][0]['content']  # content is nested, not at root
```
