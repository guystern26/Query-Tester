# Spec 05 -- Field Value Rules

## FieldValue Structure

```ts
interface FieldValue {
    id: EntityId;
    field: string;   // field name -- must be non-empty if value is non-empty
    value: string;   // always a string, can be empty ''
}
```

## Fields Mode: What Gets Sent

| UI State | Payload |
|----------|---------|
| field: "user", value: "john" | `{ "user": "john" }` |
| field: "user", value: "" | `{ "user": "" }` -- empty string is valid |
| field: "user", value: " " | `{ "user": " " }` -- space is valid, NOT same as "" |
| field: "", value: "" | Ignored -- both empty = not configured |
| field: "", value: "john" | Validation error -- field name required |

## Field Inheritance

In fields mode, the first event's fields serve as the template for subsequent events in the same input. New events inherit the field names from the first event.

## Empty Field Name = Skip

When building the payload, field-value pairs with empty field names are filtered out. If all pairs are empty, the event produces `{}`.

## Multivalue Fields

If a value contains newline characters, each line becomes a separate value in the indexed event. This maps to Splunk's multivalue field concept.

## JSON Mode

Raw JSON string stored in the input, parsed as-is at payload build time. No field inheritance applies. The string is validated with `JSON.parse()` -- invalid JSON prevents the test from running.

## query_data Mode

No manual events. The input specifies a sub-query (`QueryDataConfig`) that runs at execution time to fetch events. Fields:
- `spl` -- the SPL query to run
- `earliest` / `latest` -- time range
- `maxEvents` -- cap on returned events (default 10,000 from `MAX_QUERY_DATA_EVENTS`)

## no_events Mode

Empty events array. The scenario runs the query without injecting any events for this input. Backend generates `makeresults count=0`.

## Generator Expansion

`GeneratorConfig` on each `TestInput` defines rules for producing additional events from templates. Generator rules are applied after manual events, expanding the event count.

### Generator Types

| Type | Behavior |
|------|----------|
| `numbered` | Sequential numbers (e.g., user_1, user_2, ...) |
| `pick_list` | Cycles through a predefined list of values |
| `random_number` | Random integers within a range |
| `unique_id` | UUID-based unique values |
| `email` | Generated email addresses |
| `ip_address` | Generated IP addresses |
| `general_field` | Custom pattern-based generation |

## Payload Building

```ts
function buildEventsForInput(input: TestInput): Record<string, string>[] {
    if (input.mode === 'no_events') return [{}];
    if (input.mode === 'json') {
        const parsed = JSON.parse(input.jsonContent || '[]');
        return Array.isArray(parsed) ? parsed : [parsed];
    }
    if (input.mode === 'query_data') return []; // handled by backend
    // fields mode
    return input.events.map(evt => {
        const pairs = evt.fieldValues.filter(fv => fv.field.trim() !== '');
        if (pairs.length === 0) return {};
        return Object.fromEntries(pairs.map(fv => [fv.field, fv.value]));
    });
}
```

Values are never trimmed. Empty string `''` and space `' '` are distinct valid values.
