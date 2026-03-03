### 19. UX Polish, Edge Cases & User Guidance

*This section covers every detail that separates a prototype from a product. Each item came from real usage friction.*

**19.1 Event Field Inheritance**
When adding a new event to an input (fields mode), the new event inherits all field NAMES from the previous event with empty values. Saves re-typing field names for every event.

```
// Store action: addEvent(scenarioId, inputId)
const lastEvent = input.events[input.events.length - 1];
const newFieldValues = lastEvent.fieldValues.map((fv, i) => ({
id: crypto.randomUUID(),
field: fv.field,     // copy field name
value: '',           // empty — user fills in
}));
```

*If no previous event exists (first event), create one empty FieldValue as placeholder.*

**19.2 Add Field to All Events**
When adding a new field, it appears on EVERY event in the input simultaneously. Without this, adding a field to Event 1 leaves Events 2–5 out of sync.

```
// Store action: addFieldToAllEvents(scenarioId, inputId)
input.events = input.events.map(event => ({
...event,
fieldValues: [...event.fieldValues, { id: genId(), field: '', value: '' }]
}));
```

Button label: '+ Add Field to All Events'. Similarly, removeFieldFromAllEvents(scenarioId, inputId, fieldIndex) removes the field at that index from ALL events.

**19.3 Multivalue Display in Results**
Backend comparison is correct (set-based, order-independent). The problem is display: multivalue fields render as 'val1val2val3' with no separator.

**Backend:**
Return multivalue fields separated by newlines: 'alice\nbob\ncharlie'.
**Frontend:**
Split on '\n' and render each value on its own line (white-space: pre-wrap or .split('\n').map() with <br/>). Makes multiple values immediately visible.

**19.4 Scenario Description**
Each scenario has a description text area below the tab bar. Placeholder: 'Describe what this scenario tests (e.g., Simulating a brute force attack with 50 failed logins)...'

**19.5 App Change Behavior**
**Saved searches: **List re-fetched. If a previously selected saved search doesn't exist in the new app, show warning: '⚠️ The saved search [name] may not exist in [new app]. Verify or select a different one.' SPL stays in editor — NOT cleared.
**Query section warning: **Dismissible banner: '⚠️ You changed the app context. Some lookups, saved searches, and macros may not be available in the new app.' Auto-hides after 10 seconds.
**Everything else stays: **Inputs, events, validation, scenarios, test name — all unchanged. Only query context changes.

**19.6 Maximum Limits**

| Entity | Max | At Limit |
| --- | --- | --- |
| Tests per session | 20 | 'New Test' disabled. |
| Scenarios per test | 10 | 'Add Scenario' disabled. |
| Inputs per scenario | 10 | 'Add Input' disabled. |
| Events per input | 50 | 'Add Event' disabled. Use Generator. |
| Fields per event | 30 | 'Add Field' disabled. |
| Field conditions | 30 | 'Add Condition' disabled. |
| Generator event count | 10,000 | Input capped. Warning shown. |

*Configurable in core/constants/limits.ts.*

**19.7 Confirmation Dialogs**
**Delete test: **'Delete [name]? This cannot be undone.' Cancel / Delete (red).
**Delete scenario: **'Delete scenario [name]?' Only if scenario has content.
**Delete input: **No confirmation (quick to recreate).
**Clear all validation: **'Clear all field conditions?'

**19.8 Run Button: Cancel & Timeout**
```
[Run Test]   → green   (ready)
[Cancel]     → red     (running, with spinner)
[Rerun Test] → blue    (done/error)
```

**Cancel:**
Uses AbortController. On cancel click, controller.abort(). Fetch rejects with AbortError. Store shows 'Test cancelled by user.'

```
let abortController: AbortController | null = null;
runTest: async () => {
abortController = new AbortController();
set({ isRunning: true });
try {
const res = await fetch(url, { signal: abortController.signal, ... });
// handle response...
} catch (e) {
if (e.name === 'AbortError')
set({ isRunning: false, testResponse: { status: 'error',
message: 'Test cancelled by user.', errors: [], warnings: [],
scenarioResults: [], summary: null, queryInfo: null } });
}
},
cancelTest: () => { abortController?.abort(); },
```

**Timeout:**
120 seconds. Auto-cancel + message: 'Test timed out after 2 minutes.' Via AbortSignal.timeout(120000).

**19.9 Contextual Notes & Warnings**
Inline guidance banners (not modals) using @splunk/react-ui Message. Help users understand what each mode does.

**TestType Change Notes**

| Switch To | Note |
| --- | --- |
| Standard | "⚠️ Standard test: Query runs against generated data. Only unspecified fields use real Splunk data." |
| Query Only | "⚠️ Query Only: Query runs directly against real Splunk data. No synthetic data injected." |

**InputMode Change Notes**

| Switch To | Note |
| --- | --- |
| JSON | "Paste raw JSON. Each top-level object becomes one event." |
| Fields | "Fill field names and values manually. Each row is an event." |
| No Events | "Returns 0 events. Tests what happens when a data source is empty." |

**Validation Type Change Notes**

| Switch To | Note |
| --- | --- |
| Standard | "Define conditions per output field. Results checked against these rules." |
| iJump Alert | "Requires _time, reason, status. Custom conditions can be added below." |

**19.10 Placeholders, Not Default Values**
UI guides with placeholder text, NOT pre-filled defaults. User must consciously fill every field.

| Field | Placeholder |
| --- | --- |
| Test name | "Put your test name here..." |
| Scenario name | "e.g., Normal user activity, Brute force attack..." |
| Scenario description | "Describe what this scenario tests..." |
| Row identifier | "e.g., index=main sourcetype=access_combined" |
| Field name | "field name" |
| Field value | "value" |
| JSON editor | "Paste your JSON data here..." |
| Validation field | "e.g., count, src_ip, status" |
| Validation value | "expected value" |
| Generator event count | "number of events to generate" |

**Payload fallbacks (submission only):**
buildPayload() applies defaults at submission: empty test name → 'Untitled Test', empty scenario name → 'Scenario 1'. The UI never shows these.

**19.11 Event Generator: Progressive Walkthrough**
Generator panel is step-by-step. User picks type FIRST, then sees config fields.

```
Step 1: Toggle generator ON
→ Shows: Event count input + 'Add Rule' button
```

```
Step 2: Click 'Add Rule'
→ Shows: Field name input + Type dropdown
→ Dropdown: [Select type...] (nothing pre-selected)
```

```
Step 3: Select type (e.g., 'pick_list')
→ ONLY NOW show config for that type:
pick_list → items (value + weight)
random_number → min, max, decimals
ip_address → type dropdown
```

```
Changing type resets config to empty for new type.
```

Dropdown labels include descriptions:

| Type | Label |
| --- | --- |
| pick_list | Pick List — Random from weighted list |
| numbered | Numbered — Sequential (server-001, 002...) |
| random_number | Random Number — Range with decimals |
| unique_id | Unique ID — UUID or custom format |
| email | Email — Generated email addresses |
| ip_address | IP Address — Private or public ranges |
| general_field | General — Custom prefix/suffix + random |

**19.12 Pre-flight Validation**
Before sending payload, frontend validates and shows specific errors. Run button tooltip shows what's missing.

| Check | Error |
| --- | --- |
| No app selected | "Select a Splunk app." |
| No SPL query | "Enter a query or select a saved search." |
| Standard: input missing row identifier | "[Scenario/Input]: row identifier required. Data can be empty ([{}]) as long as row identifier is set." |
| Value without field name | "[Scenario/Input]: field name required." |
| JSON: invalid syntax | "[Scenario/Input]: invalid JSON." |
| Generator ON, no rules | "Add rules or disable generator." |
| Generator rule: no type | "Select generation type for [field]." |

If any check fails, Run does NOT execute. First error scrolls into view with red highlight.