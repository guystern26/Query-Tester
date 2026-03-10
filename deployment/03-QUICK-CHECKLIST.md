# Quick Checklist — Copy & Paste Reference

## Files to copy to inner network Splunk

```
✅ = must copy    🔍 = check/verify    ⛔ = do NOT copy
```

### bin/ (Python backend)
```
✅ bin/config.py                      ← NEW, edit for target environment
✅ bin/query_tester.py
✅ bin/logger.py
✅ bin/core/*.py                      (6 files)
✅ bin/data/*.py                      (4 files, includes new sub_query_runner.py)
✅ bin/generators/*.py                (10 files)
✅ bin/spl/*.py                       (4 files)
✅ bin/validation/*.py                (3 files)
⛔ bin/splunklib/                     already on target
⛔ bin/packaging/                     already on target
⛔ bin/__pycache__/                   delete these
```

### appserver/ (Compiled frontend)
```
✅ appserver/static/pages/QueryTesterApp.js
✅ appserver/static/pages/QueryTesterApp.css
🔍 appserver/templates/QueryTesterApp.html   ← only if folder name differs
```

### default/ (Splunk configs)
```
🔍 default/indexes.conf              ← only if temp index doesn't exist
🔍 default/restmap.conf              ← verify it exists and matches
🔍 default/web.conf                  ← verify it exists and matches
⛔ default/app.conf                   already on target
⛔ default/data/ui/                   already on target
```

### Things to edit on target
```
1. bin/config.py     → HEC_TOKEN, SPLUNK_HOST, SPLUNK_PORT
2. (Only if you rebuild on inner network) src/config/env.ts → LLM_ENDPOINT=''
```

### Post-copy
```
1. Delete __pycache__ folders
2. Set permissions (Linux: chown splunk:splunk, chmod 755)
3. Verify LF line endings on all .py files
4. Restart Splunk
5. Test: http://<host>:8000/app/<folder_name>/QueryTesterApp
```
