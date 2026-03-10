# Deployment Guide — Splunk Query Tester

## Prerequisites

| Requirement | Details |
|---|---|
| Splunk Enterprise | 9.2.x or later |
| HEC (HTTP Event Collector) | Enabled, with a token created |
| Node.js | 18.x (for building the frontend) |
| Temp index | Created via `indexes.conf` (bundled) or manually |

## Files to Edit

Only **2 files** need editing when deploying to a new environment:

### 1. Backend — `packages/query-tester/stage/bin/config.py`

| Setting | What to change |
|---|---|
| `SPLUNK_HOST` | Hostname of the Splunk instance (default: `localhost`) |
| `SPLUNK_PORT` | splunkd management port (default: `8089`) |
| `HEC_HOST` | HEC endpoint hostname (default: `localhost`) |
| `HEC_PORT` | HEC port (default: `8088`) |
| `HEC_TOKEN` | Your HEC token (required) |
| `HEC_SSL_VERIFY` | `True` if using a valid TLS cert |
| `TEMP_INDEX` | Name of the temp index (default: `temp_query_tester`) |
| `LOG_FILE` | Path to log file (default: `$SPLUNK_HOME/var/log/splunk/query_tester.log`) |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, or `ERROR` |

### 2. Frontend — `packages/query-tester-app/src/config/env.ts`

| Setting | What to change |
|---|---|
| `REST_PATH` | Must match `restmap.conf` match path |
| `LLM_ENDPOINT` | OpenAI/LLM URL, or `''` to disable AI features |
| `LLM_API_KEY` | API key for the LLM service |

> **Note:** After editing `env.ts`, a frontend rebuild is required (see below).

## Deployment Steps

### Option A: Fresh install (copy)

```bash
# 1. Edit config files (see above)
# 2. Build and deploy
./deploy.sh /opt/splunk/etc/apps

# 3. Restart Splunk
/opt/splunk/bin/splunk restart
```

### Option B: Symlink (development)

```bash
# Create a symlink/junction from Splunk apps to the stage directory
# Linux/Mac:
ln -s /path/to/repo/packages/query-tester/stage /opt/splunk/etc/apps/query-tester

# Windows (run as admin):
mklink /D "C:\Program Files\Splunk\etc\apps\query-tester" "C:\path\to\repo\packages\query-tester\stage"
```

## When is a Frontend Rebuild Required?

### Rebuild required (run webpack before deploying):
- Any change to `config/env.ts`
- Any change to React components, store, or API files
- Any `.tsx`, `.ts`, or `.css` file under `packages/query-tester-app/`

### Rebuild NOT required (just restart Splunk):
- Changes to `bin/config.py` (Python, no compilation needed)
- Changes to Splunk config files (`app.conf`, `restmap.conf`, `indexes.conf`)
- Changes to any `.py` file under `bin/`

### How to rebuild:
```bash
cd packages/query-tester
./node_modules/.bin/webpack --mode=production
```

## Verifying the Installation

1. **App visible in Splunk:** Navigate to `http://<host>:8000/app/query-tester`
2. **REST handler responds:** `curl -k https://localhost:8089/services/splunk_query_tester/query_tester -H "Authorization: Splunk <token>"`
3. **Check logs:** `tail -f $SPLUNK_HOME/var/log/splunk/query_tester.log`
4. **HEC works:** The first test run will index events — check for errors in the log

## Air-Gapped / Inner Network Notes

- No external network access is required at runtime
- The LLM/AI feature (Extract Fields button) requires internet access to OpenAI. Set `LLM_ENDPOINT: ''` in `env.ts` to disable it
- All dependencies are bundled — no `pip install` or `npm install` needed on the Splunk server
- Only the `stage/` directory needs to be copied to the target machine

## Splunk Configuration Files

These are bundled in `stage/default/` and should not need editing:

| File | Purpose |
|---|---|
| `app.conf` | App identity and metadata |
| `restmap.conf` | REST handler registration |
| `web.conf` | REST endpoint exposure |
| `indexes.conf` | Temp index definition with 24h auto-retention |

## Troubleshooting

| Problem | Solution |
|---|---|
| App not visible | Check `app.conf` has `is_visible = 1` |
| REST handler 404 | Verify `restmap.conf` and `web.conf` match |
| HEC errors | Check `HEC_TOKEN` in `config.py`, verify HEC is enabled |
| Python errors | Check `query_tester.log` for stack traces |
| Empty results | Verify the temp index exists: `index=temp_query_tester` |
| 500 on Linux | Ensure all `.py` files have LF line endings (not CRLF) |
