# 02 — Entry Point: `query_tester.py` + Splunk Wiring

## Role

This is the **only** file that touches Splunk's REST handler protocol. It is minimal on purpose — just wires Splunk's `MConfigHandler` to `TestRunner`. All logic lives elsewhere.

---

## Public Interface

Expose these three functions at module level:

```
handler(config, in_string)
    → Splunk handler protocol entry point

post_handler(payload: dict, session_key: str) -> tuple[dict, int]
    → Calls TestRunner(session_key).run_test(payload)
    → Returns (result_dict, http_status_code)

get_handler(session_key: str) -> dict
    → Health check. Returns {"status": "ok", "version": "1.0"}
```

`post_handler` is the only real entry point. `get_handler` is a health check for the frontend.

---

## Splunk Handler Class

```python
class QueryTesterHandler(admin.MConfigHandler):

    def setup(self):
        pass

    def handleList(self, confInfo):
        # GET — health check
        confInfo['status']['ready'] = 'true'
        confInfo['status']['version'] = '1.0'

    def handleCreate(self, confInfo):
        # POST — run a test
        raw = self.callerArgs.data.get('__rest_input', ['{}'])[0]
        payload = json.loads(raw)
        runner = TestRunner(self.getSessionKey())
        result, status_code = runner.run_test(payload)
        confInfo['result']['data'] = json.dumps(result)
        confInfo['result']['status'] = str(status_code)
```

Wrap `handleCreate` body in try/except. On any exception, write to logger (NOT print) and return:
```json
{ "error": "<message>", "status": "error" }
```
with status `'500'`.

---

## restmap.conf Registration

```ini
[script:query_tester]
match = /query_tester
script = query_tester.py
scripttype = persist
handler = query_tester.QueryTesterHandler
requireAuthentication = true
```

---

## Frontend API Endpoint

The frontend calls:
```
POST /splunkd/__raw/services/splunk_query_tester/query_tester
```

The Splunk Web port (8000) proxies to splunkd port (8089). The CSRF token is handled by the frontend's `splunkFetch` helper — the backend does not need to deal with it.

---

## Critical: No stdout

Every log call in this file must use `logger = get_logger(__name__)`. Never `print()`. stdout output corrupts the REST response and causes silent failures.
