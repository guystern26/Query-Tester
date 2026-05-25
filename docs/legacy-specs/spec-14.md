# spec-14 — Errors, Warnings & SPL Linting

## ResponseMessage

```ts
interface ResponseMessage {
    severity: 'info' | 'warning' | 'error' | 'fatal' | 'success';
    text: string;
    field?: string; // optional field reference for targeted display
}
```

Messages arrive from the backend in `TestResponse.messages[]`. Displayed in the results
area grouped by severity.

## Scenario-Level Errors

Each `ScenarioResult` carries:
- `error: string | null` — fatal scenario error (e.g., SPL execution failure)
- `warnings: string[]` — non-fatal issues (e.g., partial match, field missing)

Per-scenario errors do not stop the run loop — other scenarios continue executing.

## SPL Linter (Frontend-Only)

Client-side dangerous command detection. No backend calls.

### Files

| File | Role |
|------|------|
| `features/query/splLinter.ts` | `lintSpl()` — parses SPL, returns warning objects |
| `features/query/splLinterRules.ts` | Rule definitions (command name, message, severity) |
| `features/query/SplWarningOverlay.tsx` | Dismissible warning banner above editor |
| `features/query/useAceMarkers.ts` | Hook that applies inline Ace markers + gutter annotations |

### Dangerous Commands Detected

`delete`, `outputlookup`, `collect`, `mcollect`, `sendemail`, and others defined
in `splLinterRules.ts`.

### Trigger Behavior

| Event | Action |
|-------|--------|
| Editor blur | Run `lintSpl()`, apply markers |
| External SPL change (e.g., saved search load) | Re-lint if editor is NOT focused |
| Editor focus | Clear all warnings (let user edit in peace) |

### Display

- Inline Ace gutter annotations (warning icons per line)
- Ace marker highlights on the dangerous command text
- `SplWarningOverlay.tsx` banner with dismiss button

## Command Policy (Backend)

Admin-configurable list of dangerous commands with severity levels. Managed from the
Setup page `CommandPolicySection`.

### Severity Levels

| Level | Behavior |
|-------|----------|
| `danger` | Blocked — backend refuses to execute |
| `warning` | User must acknowledge before running |
| `info` | Informational notice only |

### Backend

`command_policy_handler.py` — REST handler for `/data/tester/command_policy/*`.
CRUD operations on the policy list stored in KVStore.

### Frontend

`commandPolicySlice` in the Zustand store manages the policy list. The Setup page
`CommandPolicySection` component provides the admin UI for adding, editing, and
removing policy entries.

The SPL linter and command policy are independent systems — the linter is purely
client-side with hardcoded rules, while the command policy is server-enforced and
admin-configurable.
