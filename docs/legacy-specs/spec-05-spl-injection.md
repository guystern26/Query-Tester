# 05 — SPL Injection (`query_injector.py`)

> **Conventions:** Follow `spec-00-conventions.md`. Pure string transformation — no Splunk calls, no file I/O. Use `STRATEGY_HANDLERS` dict (Open/Closed).

---

## What the Frontend Sends (Relevant to This File)

The frontend sends the SPL the user typed, plus a `rowIdentifier` per input that marks what to replace:

```json
{
  "query": "index=main sourcetype=firewall | stats count by src_ip",
  "scenarios": [{
    "inputs": [{
      "rowIdentifier": "index=main sourcetype=firewall"
    }]
  }]
}
```

The injector's job: rewrite `query` so it hits the temp index instead of production, using the `rowIdentifier` as the exact string to replace.

---

## Step 1: Detect Strategy

```python
STRATEGY_DETECTORS: List[Tuple[str, Callable[[str], bool]]] = [
    ('inputlookup', lambda s: bool(re.search(r'\|\s*inputlookup\b',  s, re.IGNORECASE))),
    ('tstats',      lambda s: bool(re.search(r'\|\s*tstats\b',       s, re.IGNORECASE))),
    ('lookup',      lambda s: bool(re.search(r'\|\s*lookup\s+\w',    s, re.IGNORECASE))),
    ('standard',    lambda s: bool(re.search(r'\bindex\s*=', _outer(s), re.IGNORECASE))),
]

def detect_strategy(self, spl: str) -> str:
    """Detect the correct injection strategy for this SPL."""
    spl_clean = spl.strip()
    for name, test in STRATEGY_DETECTORS:
        if test(spl_clean):
            return name
    return 'no_index'
```

Detection is ordered — `inputlookup` and `tstats` must be checked before `standard` because they can also contain `index=` in nearby text.

---

## Step 2: Apply Strategy

| Strategy | What happens | When |
|---|---|---|
| `inputlookup` | SPL returned **unchanged** | `\| inputlookup` found — reads a static file, can't inject |
| `tstats` | SPL returned **unchanged** + warning added | `\| tstats` found — uses datamodels, not index= |
| `lookup` | Replace outer `index=` **and** swap `\| lookup <name>` with temp CSV | `\| lookup <name>` found |
| `standard` | Replace outer `index=` only | Normal `index=` query |
| `no_index` | Prepend `index=temp_query_tester run_id=<run_id>` | No `index=` found anywhere |

---

## Index Replacement — All Edge Cases

### Primary: replace the full `rowIdentifier` string

The `rowIdentifier` from the payload (e.g. `"index=main sourcetype=firewall"`) is the **exact string to replace** — not just the `index=` part.

```python
def _replace_by_row_identifier(self, spl: str, row_identifier: str, replacement: str) -> str:
    """Try to replace the full rowIdentifier string first."""
    escaped = re.escape(row_identifier.strip())
    result, n = re.subn(escaped, replacement, spl, count=1, flags=re.IGNORECASE)
    return result if n > 0 else None   # None signals "not found, try fallback"
```

If the `rowIdentifier` is not found verbatim → fall back to regex `index=` replacement.

### Fallback: regex `index=` replacement — outer query only

Only replace `index=` that appears **before the first `[`** (subsearch bracket):

```python
INDEX_PATTERN = re.compile(r'(?i)\bindex\s*=\s*["\']?[\w\*\-\.]+["\']?')

def _replace_outer_index(self, spl: str, run_id: str) -> str:
    """Replace index= in the outer query only. Leave subsearch brackets untouched."""
    replacement = f'index=temp_query_tester run_id={run_id}'
    bracket_pos = spl.find('[')

    if bracket_pos == -1:
        # No subsearch — replace first occurrence anywhere
        return INDEX_PATTERN.sub(replacement, spl, count=1)

    outer = spl[:bracket_pos]
    inner = spl[bracket_pos:]
    return INDEX_PATTERN.sub(replacement, outer, count=1) + inner
```

### Edge case: `| search index=x` mid-pipeline

Only replace `index=` that appears **before the first pipe**:

```python
def _replace_datasource_index(self, spl: str, run_id: str) -> str:
    """Replace index= at the data source position — before the first pipe."""
    replacement = f'index=temp_query_tester run_id={run_id}'
    first_pipe = spl.find('|')

    if first_pipe > 0 and re.search(r'\bindex\s*=', spl[:first_pipe], re.IGNORECASE):
        # index= is in the pre-pipe section — replace only there
        pre  = INDEX_PATTERN.sub(replacement, spl[:first_pipe], count=1)
        return pre + spl[first_pipe:]

    # index= only appears after pipes — replace first occurrence
    return INDEX_PATTERN.sub(replacement, spl, count=1)
```

---

## Edge Cases: Quick Reference

| SPL Pattern | Behaviour |
|---|---|
| `index=main \| stats count` | Replace `index=main` → temp index |
| `index=main sourcetype=fw \| stats count` | rowIdentifier `"index=main sourcetype=fw"` replaced as whole string |
| `index=main \| join host [search index=other ...]` | Replace outer `index=main`, leave `index=other` inside `[...]` untouched |
| `index=main \| append [search index=backup \| head 100]` | Same — outer replaced, inner untouched |
| `index=main \| stats count \| search index=filtered` | Replace `index=main` only (before first pipe) |
| `\| tstats count from datamodel=Network_Traffic` | Return unchanged + add warning |
| `\| inputlookup users.csv \| stats count` | Return unchanged — no injection needed |
| `\| makeresults count=10 \| eval x=1` | No `index=` → prepend `index=temp_query_tester run_id=X` |

---

## Concrete Injection Examples

**Standard:**
```
Input SPL:   index=main sourcetype=firewall | stats count by src_ip
rowId:       "index=main sourcetype=firewall"
run_id:      a1b2c3d4

Output SPL:  index=temp_query_tester run_id=a1b2c3d4 | stats count by src_ip
```

**Join — outer replaced, inner untouched:**
```
Input SPL:   index=main | join host [search index=other | stats count by host]
run_id:      a1b2c3d4

Output SPL:  index=temp_query_tester run_id=a1b2c3d4 | join host [search index=other | stats count by host]
```

**no_index — prepend:**
```
Input SPL:   | makeresults count=10 | eval host="test"
run_id:      a1b2c3d4

Output SPL:  index=temp_query_tester run_id=a1b2c3d4 | makeresults count=10 | eval host="test"
```

---

## Lookup Replacement

When strategy is `lookup`:

```python
LOOKUP_PATTERN = re.compile(r'(?i)(\|\s*lookup\s+)([\w\-\.]+)')

def _replace_lookup(self, spl: str, run_id: str) -> str:
    """Replace | lookup <name> with the temp CSV filename."""
    temp_file = f'temp_lookup_{run_id}.csv'
    return LOOKUP_PATTERN.sub(lambda m: m.group(1) + temp_file, spl, count=1)
```

---

## tstats Warning

When `tstats` is detected, add this to the analysis warnings before returning the SPL unchanged:

```python
Warning(
    message='tstats queries use datamodels and cannot be injected with test data. '
            'Use testType="query_only" to run this query without data injection.',
    severity='warning',
)
```
