# 11 — Query Executor & Logger

---

## `query_executor.py`

Executes SPL via splunklib. Returns results as `List[dict]`. Nothing else.

### Connection

```python
import splunklib.client as client

service = client.connect(
    host='localhost',
    port=8089,
    splunkToken=session_key,
)
```

### Execution

```python
def run(spl: str, timeout: int = 60) -> List[dict]:
    job = service.jobs.create(spl, exec_mode='blocking', timeout=timeout)
    reader = splunklib.results.ResultsReader(job.results())

    rows = [
        dict(result)
        for result in reader
        if not isinstance(result, splunklib.results.Message)
    ]

    job.cancel()
    return rows
```

- Use `exec_mode='blocking'` — simplest, waits for completion
- Always filter out `splunklib.results.Message` objects from the reader (Splunk mixes these in)
- Return empty list `[]` for 0-result queries — this is not an error, the validator handles it
- Always cancel the job after reading results to free Splunk resources
- Raise `RuntimeError` with a meaningful message on `splunklib.binding.HTTPError`

### Splunk REST Response Format

When fetching saved searches or any Splunk REST endpoint directly (not through splunklib objects), the response wraps content in:
```python
data['entry'][0]['content']   # correct
data['search']                # wrong — doesn't exist at root level
```

### tstats Guard

Before executing, check if SPL contains `| tstats`. If yes, log a warning but still execute — don't block it. It may be intentional in `query_only` mode.

---

## `logger.py`

File-based logger. **`print()` is forbidden in every file in this project.**

### Setup

```python
LOG_FILE = os.environ.get(
    'QUERY_TESTER_LOG',
    '/opt/splunk/var/log/splunk/query_tester.log'
)

FORMAT = '%(asctime)s %(levelname)-8s [%(name)s] %(message)s'
```

### Interface

```python
def get_logger(name: str) -> logging.Logger:
    ...
```

Safe to call multiple times from any module — handlers are added to the root logger once only (guarded by a module-level flag). Returns a standard Python `Logger` instance.

### Usage in every module

```python
from logger import get_logger
logger = get_logger(__name__)

logger.info('Indexed %d events for run_id=%s', len(events), run_id)
logger.warning('Cleanup failed for run_id=%s: %s', run_id, str(e))
logger.error('Query execution error: %s', str(e), exc_info=True)
```

Never use `print()`. Never use `logging.basicConfig()` (conflicts with Splunk's own logging setup).
