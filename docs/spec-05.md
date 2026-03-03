### 5. Field Value Rules & Edge Cases

These rules define exactly how field-value pairs translate to payload data. Every edge case is documented so the next developer doesn't have to guess.

**5.1 Fields Mode: What Gets Sent**

| State in UI | Payload Result |
| --- | --- |
| field: "user", value: "john" | { "user": "john" } |
| field: "user", value: "" | { "user": "" }  — empty string is valid, field name present |
| field: "user", value: " " | { "user": " " }  — single space is valid, NOT same as "" |
| field: "", value: "" | Ignored. Both empty = not configured yet. Event produces [{}] |
| field: "", value: "john" | VALIDATION ERROR. Field name required when value is non-empty. |
| All fieldValues empty (field:"", value:"") | [{}]  — same as no_events mode |
| inputMode: "no_events" | [{}]  — backend generates makeresults count=0 |

**5.2 Field Name Requirements**
**A field name MUST be filled if:**
The value field is non-empty (even a single space).
The user has enabled the event generator for this input (generator needs field names to populate).

**A field name can be empty if:**
The value field is also empty (both empty = row not configured).
The event generator is disabled.

**5.3 JSON Mode: Validation on Upload vs Edit**
**File upload (.json only):**
On upload, file.text() reads content, JSON.parse() validates it.
If valid: raw string stored in jsonContent, fileRef gets {name, size}.
If invalid: error shown on the input card. Nothing stored.
File object itself is NEVER stored in state.

**Manual editing in JSON editor:**
jsonContent stores the raw string on every change (debounced 300ms).
UI shows live validation feedback (green border = valid, red border + message = invalid).
Store accepts any string. Validation is UI feedback only.
JSON.parse() is the final gate in buildPayload() before sending to backend.

**5.4 Building the Events Array for Payload**
```
function buildEventsForInput(input: TestInput): Record<string, string>[] {
// no_events mode: always [{}]
if (input.inputMode === 'no_events') return [{}];
```

```
// json mode: parse the raw string
if (input.inputMode === 'json') {
const parsed = JSON.parse(input.jsonContent || '[]');
return Array.isArray(parsed) ? parsed : [parsed];
}
```

```
// fields mode: convert events to objects
return input.events.map(evt => {
const pairs = evt.fieldValues.filter(fv => fv.field.trim() !== '');
if (pairs.length === 0) return {};  // all empty = [{}]
return Object.fromEntries(pairs.map(fv => [fv.field, fv.value]));
// Note: value can be '' or ' '. Both are valid. No trimming on value.
});
}
```