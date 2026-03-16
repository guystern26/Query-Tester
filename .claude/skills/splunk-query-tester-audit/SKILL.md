---
name: query-tester-audit
description: |
  Audits code in the Splunk Query Tester project for violations of project rules. Use this skill
  whenever you finish writing or modifying any file in this project — frontend TypeScript/React or
  backend Python — even if the task feels small. Also use it when the user asks to "audit", "check",
  "verify", or "review" any file. Do NOT skip this just because the change was minor. This skill
  is the enforcement gate for project conventions that are frequently violated and hard to catch
  later. Trigger for any of: new file created, existing file modified, feature completed, or user
  asking for a code review.
---

# Query Tester — Code Audit Skill

Run this audit after every significant code change. Fix all violations found. Do not just report them.

---

## Step 1 — Identify files to audit

If the user named specific files, audit those.  
If you just wrote or modified code, audit every file you touched.  
If the user said "audit everything", run the grep sweeps below across the full `stage/bin/` and `src/` directories.

---

## Step 2 — Backend audit (Python files in `stage/bin/`)

Run these grep checks. Every command must return **zero matches**. If it returns anything, fix it before moving on.

```bash
# 1. No print() anywhere — corrupts Splunk REST responses
grep -rn "print(" stage/bin/*.py

# 2. No walrus operator
grep -rn ":= " stage/bin/*.py

# 3. No X | None union syntax — use Optional[X]
grep -rn " | None" stage/bin/*.py

# 4. No str.removeprefix / str.removesuffix (Python 3.10+)
grep -rn "\.removeprefix\|\.removesuffix" stage/bin/*.py

# 5. No dict union operator (Python 3.9+)
grep -rn "[^|]|[^|]" stage/bin/*.py | grep "= {" || true   # too broad — instead:
grep -rn "= .*} | {" stage/bin/*.py

# 6. No built-in generics — list[x], dict[x], tuple[x] (Python 3.9+)
grep -rn "def .*: list\[" stage/bin/*.py
grep -rn "def .*: dict\[" stage/bin/*.py
grep -rn ": list\[" stage/bin/*.py
grep -rn ": dict\[" stage/bin/*.py

# 7. No match/case statement (Python 3.10+)
grep -rn "^\s*match " stage/bin/*.py

# 8. No dataclasses.asdict() — must use explicit _to_dict()
grep -rn "dataclasses\.asdict\|asdict(" stage/bin/*.py

# 9. No multiple PersistentServerConnectionApplication classes per file
for f in stage/bin/*.py; do
  count=$(grep -c "class.*PersistentServerConnectionApplication" "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 1 ]; then echo "VIOLATION: $f has $count handler classes"; fi
done

# 10. from __future__ import annotations must be first non-comment line
for f in stage/bin/*.py; do
  first=$(grep -v "^#\|^$\|^\"\"\"" "$f" | head -1)
  if [[ "$first" != "from __future__ import annotations" ]]; then
    echo "MISSING __future__ import: $f — first line: $first"
  fi
done
```

### File size check (backend)
```bash
for f in stage/bin/*.py; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 200 ]; then echo "TOO LONG ($lines lines): $f"; fi
done
```

### After fixing, syntax-check every modified Python file:
```bash
# Use py on Windows, python3 on Linux
py -m py_compile stage/bin/<file>.py
# or
python3 -m py_compile stage/bin/<file>.py
```

---

## Step 3 — Frontend audit (TypeScript/TSX files in `src/`)

### Type safety — no `any`
```bash
grep -rn ": any" src/
grep -rn "as any" src/
grep -rn "<any>" src/
```
Every match is a violation. Replace with proper types. If the shape is genuinely unknown, use `unknown` and narrow it.

### Exported functions must have explicit return types
Check every `export function` and `export const` that is a function. If it lacks a return type annotation, add one.

```bash
# Spot exported functions missing return types
grep -rn "^export function\|^export const.*=.*=>" src/ | grep -v ": void\|: string\|: number\|: boolean\|: Promise\|: React\|: JSX\|: [A-Z]"
```
This is approximate — review matches manually and add return types where missing.

### No `console.log` in production code
```bash
grep -rn "console\.log" src/
```

### No commented-out code blocks
Scan modified files manually. Remove any `// old code` blocks or commented JSX.

### Props interface check
Every component must have a named interface above it (not inline). Example:
```ts
// ✅ correct
interface Props { value: string; onChange: (v: string) => void }
const MyComponent = ({ value, onChange }: Props) => { ... }

// ❌ wrong
const MyComponent = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => { ... }
```

### React 16 — banned APIs
```bash
grep -rn "createRoot\|ReactDOM\.createRoot" src/
grep -rn "useId\(\)" src/
grep -rn "useDeferredValue\|useTransition\|useSyncExternalStore" src/
```
Any match = violation. These are React 18+. Use `ReactDOM.render()` only.

### Zustand import style
```bash
grep -rn "{ create }" src/
```
Must be `import create from 'zustand'` (default import). `{ create }` is v5 and fails silently.

### No API calls inside components
```bash
grep -rn "splunkApi\.\|fetch(" src/components/ src/pages/
```
API calls belong in store actions or hooks only. Any direct call inside a component is a violation.

### No magic strings or numbers
Check modified files for hardcoded strings that should be constants (collection names, endpoint paths, status strings, etc.).

### File size check (frontend)
```bash
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```
Any file over 200 lines — evaluate whether it has a single clear responsibility. If it needs "and" to describe it, split it.

---

## Step 4 — Cross-stack checks

Run these when touching code that crosses the frontend/backend boundary:

- `snake_case ↔ camelCase` translation happens **only** in the `api/` layer. Never leaks either direction.
- KVStore collection names must be identical across `collections.conf` and every `kvstore_client` call:
  ```bash
  grep -rn "saved_tests\|scheduled_tests\|test_run_history" stage/default/collections.conf stage/bin/*.py src/
  ```
- Every backend endpoint must have a corresponding frontend API function and store action. Flag any gaps.

---

## Step 5 — Final verification commands

Run these before declaring done. All must pass clean:

```bash
# TypeScript — zero errors required
npx tsc --noEmit

# Frontend build — must complete clean
yarn build

# Python syntax check on every modified file
py -m py_compile stage/bin/<file>.py

# Backend tests
cd stage/bin && py -m pytest tests/ -v
```

If any command fails, fix the errors and re-run before finishing.

---

## Audit output format

After running the audit, report results as:

```
## Audit Results

### Violations fixed
- [file] — [what was wrong and what was done]

### Checks passed
- [list of grep checks that returned zero matches]

### Build / type check
- tsc: ✅ / ❌
- yarn build: ✅ / ❌
- py_compile: ✅ / ❌
```

Do not say "no issues found" without having actually run the grep checks. Do not skip Step 5.