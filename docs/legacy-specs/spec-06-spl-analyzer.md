# 06 — SPL Analyzer (`spl_analyzer.py`)

Inspects SPL text. Returns warnings and command lists. **Never modifies SPL.**

---

## Unauthorized Commands

Commands that require elevated Splunk permissions or cause side effects on production data. Severity: `danger`.

```
delete, drop, collect, outputlookup, sendemail,
rest, script, map, localop, dbinspect, audit,
tscollect, meventcollect
```

---

## Unusual Commands

Valid commands, but worth flagging to the user. Severity: `warning`.

```
uniq, transaction, multisearch, appendpipe,
join, selfjoin, gentimes, loadjob, savedsearch
```

---

## Specific Warning Messages

| Command / Pattern | Message | Severity |
|---|---|---|
| `join` | Returns only 50,000 results. Consider `append` + `stats values(*) by *` instead | `warning` |
| `append` | Limited to 1 million results | `warning` |
| `transaction` | Resource-intensive. Consider using `stats` if possible | `caution` |
| `uniq` | Removes only *consecutive* duplicate events — not like SQL DISTINCT. Sort by the target field first, or use `dedup` for full deduplication | `info` |
| `[...]` subsearch found | Subsearches are limited to 50,000 results and a 60-second timeout | `warning` |
| `| tstats` | tstats queries cannot be injected with test data. Run as query_only | `warning` |

---

## Command Extraction

1. Strip all content inside `[...]` brackets (subsearch bodies) — avoids false positives
2. Find all `| <command>` pipe-prefixed tokens with regex: `\|\s*([a-zA-Z_]+)`
3. Also capture the first token before any pipe if it looks like a command word
4. Lowercase all, deduplicate preserving order

---

## Output Structure

```
SPLAnalysis
  unauthorized_commands: List[str]    # commands from UNAUTHORIZED set found in SPL
  unusual_commands: List[str]         # commands from UNUSUAL set found in SPL
  uniq_limitations: Optional[str]     # the uniq note string, or None if uniq not used
  commands_used: List[str]            # all detected commands (deduplicated, ordered)
  warnings: List[dict]                # [{message: str, severity: str}]
```

Warnings list contains one entry per detected issue. Multiple warnings can appear for the same query (e.g. `join` + `uniq` + subsearch all found → 3 warnings).
