# Part 2: Deploy into Existing QueryTester Splunk App

## Assumptions
- You already have a `QueryTester` app installed on your inner network Splunk
- The app folder is at: `$SPLUNK_HOME/etc/apps/QueryTester/` (or whatever your folder name is)
- You have the compiled `QueryTesterApp.js` and `QueryTesterApp.css` from Part 1

---

## Overview — What goes where

```
$SPLUNK_HOME/etc/apps/QueryTester/
│
├── bin/                          ← REPLACE Python files (Step 1)
│   ├── config.py                ← NEW — deployment config (Step 2)
│   ├── query_tester.py          ← REPLACE
│   ├── logger.py                ← REPLACE
│   ├── core/                    ← REPLACE all .py files
│   ├── data/                    ← REPLACE all .py files
│   ├── generators/              ← REPLACE all .py files
│   ├── spl/                     ← REPLACE all .py files
│   ├── validation/              ← REPLACE all .py files
│   ├── splunklib/               ← DO NOT TOUCH (already there)
│   └── packaging/               ← DO NOT TOUCH (already there)
│
├── appserver/
│   ├── static/pages/
│   │   ├── QueryTesterApp.js    ← REPLACE (Step 3)
│   │   └── QueryTesterApp.css   ← REPLACE (Step 3)
│   └── templates/
│       └── QueryTesterApp.html  ← CHECK folder name (Step 4)
│
├── default/
│   ├── indexes.conf             ← ADD if missing (Step 5)
│   ├── app.conf                 ← already exists, don't touch
│   ├── restmap.conf             ← already exists, verify (Step 6)
│   ├── web.conf                 ← already exists, verify (Step 6)
│   └── data/ui/                 ← already exists, don't touch
│
└── metadata/
    └── default.meta             ← already exists, don't touch
```

---

## Step 1 — Copy Python backend files

Copy these `.py` files from your dev machine to the target Splunk, **overwriting** existing ones:

```
FROM: packages/query-tester/stage/bin/
TO:   $SPLUNK_HOME/etc/apps/QueryTester/bin/

Files to copy:
  config.py                  ← NEW file
  query_tester.py
  logger.py

  core/__init__.py
  core/helpers.py
  core/models.py
  core/payload_parser.py
  core/response_builder.py
  core/test_runner.py
  core/validation_parser.py

  data/__init__.py
  data/data_indexer.py
  data/lookup_manager.py
  data/sub_query_runner.py   ← NEW file

  generators/__init__.py
  generators/config_parser.py
  generators/email.py
  generators/event_generator.py
  generators/general_field.py
  generators/ip_address.py
  generators/numbered.py
  generators/pick_list.py
  generators/random_number.py
  generators/unique_id.py

  spl/__init__.py
  spl/query_executor.py
  spl/query_injector.py
  spl/spl_analyzer.py

  validation/__init__.py
  validation/condition_handlers.py
  validation/result_validator.py
```

**DO NOT copy:**
- `bin/splunklib/` — already exists on target, leave it
- `bin/packaging/` — already exists on target, leave it
- `bin/__pycache__/` — delete these if they exist, Splunk regenerates them

**IMPORTANT:** All `.py` files MUST have **LF line endings** (not CRLF). CRLF causes a 500 error on Linux Splunk. If you copy from Windows, verify with `file *.py` — it should say "ASCII text", not "ASCII text, with CRLF line terminators".

---

## Step 2 — Edit config.py for your environment

Open `$SPLUNK_HOME/etc/apps/QueryTester/bin/config.py` and set:

```python
# ─── MUST CHANGE ─────────────────────────────────────────────────

SPLUNK_HOST = "localhost"              # your Splunk server hostname
SPLUNK_PORT = 8089                     # splunkd management port

HEC_HOST = "localhost"                 # HEC endpoint hostname
HEC_PORT = 8088                        # HEC port
HEC_TOKEN = "your-hec-token-here"      # ← REQUIRED — get from Splunk Settings > Data Inputs > HTTP Event Collector
HEC_SSL_VERIFY = False                 # True if using valid TLS cert

TEMP_INDEX = "temp_query_tester"       # must match indexes.conf (Step 5)

# ─── OPTIONAL ────────────────────────────────────────────────────

LOG_FILE = ""                          # leave empty for $SPLUNK_HOME/var/log/splunk/query_tester.log
LOG_LEVEL = "INFO"                     # DEBUG for troubleshooting
```

---

## Step 3 — Copy compiled frontend files

Copy the 2 webpack output files:

```
FROM: packages/query-tester/stage/appserver/static/pages/QueryTesterApp.js
FROM: packages/query-tester/stage/appserver/static/pages/QueryTesterApp.css

TO:   $SPLUNK_HOME/etc/apps/QueryTester/appserver/static/pages/QueryTesterApp.js
TO:   $SPLUNK_HOME/etc/apps/QueryTester/appserver/static/pages/QueryTesterApp.css
```

Overwrite the existing files.

---

## Step 4 — Check HTML template folder name

Open `$SPLUNK_HOME/etc/apps/QueryTester/appserver/templates/QueryTesterApp.html`.

Look at lines 10 and 21. They reference the app folder name:

```html
<!-- Line 10 -->
<link rel="stylesheet" href="${make_url('/static/app/query-tester/pages/QueryTesterApp.css')}" />

<!-- Line 21 -->
<% page_path = "/static/app/query-tester/pages/" + page + ".js" %>
```

**If your app folder is called `QueryTester` (not `query-tester`)**, change both lines:

```html
<!-- Line 10 -->
<link rel="stylesheet" href="${make_url('/static/app/QueryTester/pages/QueryTesterApp.css')}" />

<!-- Line 21 -->
<% page_path = "/static/app/QueryTester/pages/" + page + ".js" %>
```

The value must match the exact folder name under `etc/apps/`.

> **If the names already match, don't touch this file.**

---

## Step 5 — Add indexes.conf (if temp index doesn't exist)

Check if the temp index exists:
```
$SPLUNK_HOME/bin/splunk search "| rest /services/data/indexes | search title=temp_query_tester"
```

If it doesn't exist, copy `indexes.conf`:

```
FROM: packages/query-tester/stage/default/indexes.conf
TO:   $SPLUNK_HOME/etc/apps/QueryTester/default/indexes.conf
```

Contents:
```ini
[temp_query_tester]
homePath   = $SPLUNK_DB/temp_query_tester/db
coldPath   = $SPLUNK_DB/temp_query_tester/colddb
thawedPath = $SPLUNK_DB/temp_query_tester/thaweddb
frozenTimePeriodInSecs = 86400
maxDataSize = auto_high_volume
```

> The index name here must match `TEMP_INDEX` in `config.py`.

---

## Step 6 — Verify restmap.conf and web.conf

Your existing app should already have these. Open them and verify:

**`default/restmap.conf`** should contain:
```ini
[script:splunk_query_tester_query_tester]
match = /splunk_query_tester/query_tester
script = query_tester.py
scripttype = persist
handler = query_tester.QueryTesterHandler
requireAuthentication = true
output_mode = json
passPayload = true
passHttpHeaders = true
passHttpCookies = true
python.version = python3
```

**`default/web.conf`** should contain:
```ini
[expose:splunk_query_tester_query_tester]
pattern = splunk_query_tester/query_tester
methods = GET,POST,DELETE
```

If these don't exist, copy them from `packages/query-tester/stage/default/`.

> The `match` path in restmap.conf must match `REST_PATH` in `env.ts`.

---

## Step 7 — Verify HEC is enabled

On the target Splunk:

1. Go to **Settings → Data Inputs → HTTP Event Collector**
2. Ensure **Global Settings → All Tokens = Enabled**
3. Create a token (or use an existing one)
4. Copy the token value into `config.py` → `HEC_TOKEN`

---

## Step 8 — Set permissions (Linux only)

```bash
chown -R splunk:splunk $SPLUNK_HOME/etc/apps/QueryTester/
chmod -R 755 $SPLUNK_HOME/etc/apps/QueryTester/
chmod +x $SPLUNK_HOME/etc/apps/QueryTester/bin/query_tester.py
```

---

## Step 9 — Delete Python cache

```bash
find $SPLUNK_HOME/etc/apps/QueryTester/bin -name "__pycache__" -exec rm -rf {} + 2>/dev/null
```

---

## Step 10 — Restart Splunk

```bash
$SPLUNK_HOME/bin/splunk restart
```

---

## Step 11 — Verify

1. **App loads:** Open `http://<splunk-host>:8000/app/QueryTester/QueryTesterApp`
2. **REST handler responds:** Check the log file:
   ```bash
   tail -f $SPLUNK_HOME/var/log/splunk/query_tester.log
   ```
3. **Run a test:** Create a simple test, run it, check for errors in the log
4. **Check temp index:** Run `index=temp_query_tester` in Splunk search — you should see indexed events after a test run

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blank white page | HTML template has wrong app folder name | Step 4 — fix folder name in `.html` |
| 404 on test run | restmap/web.conf missing or wrong | Step 6 — verify configs |
| "HEC token not configured" | Missing token in config.py | Step 2 + Step 7 |
| 500 error on Linux | CRLF line endings in .py files | Convert to LF: `dos2unix bin/*.py bin/**/*.py` |
| "No module named config" | config.py not copied | Step 1 — make sure config.py is in bin/ |
| Temp index not found | indexes.conf missing | Step 5 |
| Page loads but API fails | REST handler path mismatch | Verify env.ts REST_PATH matches restmap.conf match path |
