# 09 — Data Indexer & Lookup Manager

> **Conventions:** Follow `spec-00-conventions.md`. Session key injected at construction. File-based logging only — no `print()`.

---

## What the Frontend Sends (Relevant to This File)

After the event generator expands the inputs, the indexer receives a flat list of event dicts. These come from the payload's `events` array (already parsed by `payload_parser.py`):

```python
# What the indexer receives — a flat list of dicts
all_events = [
    {'src_ip': '10.0.0.1', 'action': 'allowed', 'bytes': '1024'},
    {'src_ip': '10.0.0.2', 'action': 'blocked', 'bytes': '512'},
    {'src_ip': '10.0.0.47', 'action': 'allowed', 'bytes': '1024'},  # from generator
    # ... up to eventCount rows
]
run_id = 'a1b2c3d4'
```

The indexer tags every event with `run_id` so the injected SPL can find them:
```
index=temp_query_tester run_id=a1b2c3d4 | stats count by src_ip
```

---

## `data_indexer.py`

### Critical: No Single Quotes in SPL

Single quotes inside a Splunk `eval` expression break silently. Always embed event data as a JSON string via `eval _raw=`:

```python
# CORRECT — JSON-safe, handles apostrophes, quotes, backslashes
def _build_index_spl(self, events: List[dict], run_id: str) -> str:
    """Build SPL to index events via makeresults + collect."""
    for event in events:
        event['run_id'] = run_id   # tag each event with this run's ID

    # JSON-encode, then escape inner quotes for embedding in SPL double-quoted string
    json_str = json.dumps(events, ensure_ascii=False)
    json_str = json_str.replace('\\', '\\\\').replace('"', '\\"')

    return (
        f'| makeresults count=1'
        f' | eval _raw="{json_str}"'
        f' | spath'
        f' | mvexpand _raw'           # expand array to multiple events
        f' | collect index=temp_query_tester sourcetype=query_tester_input'
    )

# WRONG — breaks if any field value contains a single quote
spl = f"| eval host='{value}'"
```

### Batching

Index in batches of 1000 events per `collect` call to stay within Splunk's per-search memory limits:

```python
BATCH_SIZE = 1000

def index_events(self, events: List[dict], run_id: str) -> None:
    """Index all events into the temp index, tagged with run_id."""
    if not events:
        logger.warning('index_events called with empty list for run_id=%s — skipping', run_id)
        return

    for i in range(0, len(events), BATCH_SIZE):
        batch = events[i:i + BATCH_SIZE]
        spl = self._build_index_spl(batch, run_id)
        self._executor.run(spl)
        logger.info('Indexed batch %d-%d for run_id=%s', i, i + len(batch), run_id)
```

### Cleanup

```python
def cleanup(self, run_id: str) -> None:
    """Delete all temp events for this run. Errors are logged, not raised."""
    try:
        spl = f'search index=temp_query_tester run_id="{run_id}" | delete'
        self._executor.run(spl)
        logger.info('Cleaned up events for run_id=%s', run_id)
    except Exception as exc:
        logger.warning('Cleanup failed for run_id=%s: %s', run_id, exc)
```

---

## `lookup_manager.py`

Used only when `detect_strategy(spl) == 'lookup'`. Creates and deletes temporary CSV files.

### Lookup Directory

```python
LOOKUP_DIR = os.environ.get(
    'QUERY_TESTER_LOOKUP_DIR',
    '/opt/splunk/etc/apps/splunk_query_tester/lookups',
)

# Filename: temp_lookup_<run_id>.csv
# Example:  temp_lookup_a1b2c3d4.csv
```

### Interface

```python
def create_temp_lookup(self, run_id: str, events: List[dict]) -> str:
    """Write events to a temp CSV file. Returns the filename (not full path)."""
    if not events:
        raise ValueError(f'Cannot create lookup for run_id={run_id}: events list is empty')

    filename = f'temp_lookup_{run_id}.csv'
    filepath = os.path.join(LOOKUP_DIR, filename)
    os.makedirs(LOOKUP_DIR, exist_ok=True)

    # Headers from first event's keys — all events should share the same schema
    fieldnames = list(events[0].keys())
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(events)

    logger.info('Created lookup %s with %d rows', filename, len(events))
    return filename

def delete_temp_lookup(self, run_id: str) -> None:
    """Delete the temp CSV. Silently ignores if file doesn't exist."""
    filepath = os.path.join(LOOKUP_DIR, f'temp_lookup_{run_id}.csv')
    try:
        os.remove(filepath)
        logger.info('Deleted lookup for run_id=%s', run_id)
    except FileNotFoundError:
        pass   # already gone — that's fine
    except Exception as exc:
        logger.warning('Could not delete lookup for run_id=%s: %s', run_id, exc)
```

---

## Lookup Strategy: Full Sequence

When `strategy == 'lookup'` (SPL contains `| lookup some_file.csv`):

1. `DataIndexer.index_events(all_events, run_id)` — index scenario events to temp index
2. `LookupManager.create_temp_lookup(run_id, all_events)` — write the same events to a CSV file
3. `QueryInjector.inject(spl, run_id, 'lookup', inputs)` — replaces `| lookup some_file.csv` with `| lookup temp_lookup_<run_id>.csv` AND replaces outer `index=` with temp index
4. `QueryExecutor.run(injected_spl)` — execute the query
5. Cleanup: `DataIndexer.cleanup(run_id)` + `LookupManager.delete_temp_lookup(run_id)`

---

## Edge Cases

| Situation | Behaviour |
|---|---|
| `events` is `[]` | Log warning, skip indexing (no Splunk call) |
| `events` contains `[{}]` | Empty event — skip indexing |
| Field value contains `"` | Handled by JSON serialization + `replace('"', '\\"')` |
| Field value contains `\` | Handled by `replace('\\', '\\\\')` before the quote escape |
| Lookup dir doesn't exist | `os.makedirs(..., exist_ok=True)` creates it automatically |
| >5000 events | HEC is an alternative but `makeresults`+`collect` is the default |
