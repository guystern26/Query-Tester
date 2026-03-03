### 6. AI-Assisted Field Extraction

The application has access to an LLM API endpoint. Two extraction features use it to auto-populate fields from the user's SPL query, reducing manual work and errors.

**6.1 Feature 1: Data Source + Input Field Extraction**
**What it does:**
Analyzes the SPL query and extracts a dictionary of data sources (row identifiers) mapped to their original fields. Example:
```
{ "index=_internal": ["host", "source", "sourcetype"],
"inputlookup users.csv": ["username", "department"] }
```

**UI Flow:**
Button in the Query section: 'Extract Fields' (with sparkle/AI icon).
On click: sends the SPL text to the LLM API endpoint.
Response is parsed and stored as extraction data on the test.
In each Input card, the row identifier becomes a hybrid input: text input + dropdown of extracted sources.
Each source can only be selected once per scenario (disabled in dropdown after selection).
When a source is selected, its fields auto-populate as empty FieldValue pairs in the input's events.
Field names are locked (shown as disabled spans) when populated from extraction.
User fills in only the values.
Button is re-clickable to re-extract if the query changes.

**Data stored on Scenario (or Test level):**
```
interface FieldExtraction {
sources: ExtractedDataSource[];
timestamp: string;                   // when extraction was performed
}
```

```
interface ExtractedDataSource {
rowIdentifier: string;               // e.g., 'index=_internal'
fields: string[];                    // e.g., ['host', 'source']
}
```

**LLM Prompt (summarized):**
Uses STOK structure (Situation/Task/Objective/Knowledge). Asks for original fields from each data source in the query. Handles edge cases: rex field= extraction, eval right-side references, stats by clauses, rename source fields, lookup OUTPUT vs match fields, subsearches, joins. Returns JSON only, no text.

**6.2 Feature 2: Validation Field Suggestion**
**What it does:**
Analyzes the SPL query and extracts a flat list of output fields that the user likely wants to validate (fields from table, stats, eval, rename, as clauses).
```
["host", "count", "status", "avg_duration"]
```

**UI Flow:**
Button in the Validation section: 'Suggest Fields' (with sparkle/AI icon).
On click: sends SPL to LLM API with a different prompt (output fields, not input fields).
Response parsed as string[].
Each field creates a FieldCondition with field name pre-filled, operator defaulting to 'not_empty'.
Unlike input extraction, validation fields are reusable (same field can appear in multiple conditions).
Field names appear as a dropdown suggestion in FieldConditionRow, but user can also type freely.
Merges with existing conditions (skips duplicates by field name).

**Key difference from Feature 1:**
Feature 1 extracts INPUT fields (what data enters the query). Returns a dict.
Feature 2 extracts OUTPUT fields (what the query produces). Returns a flat list.

**6.3 API Integration**
```
// core/api/llmApi.ts
```

```
export async function extractDataSources(spl: string): Promise<ExtractedDataSource[]> {
const response = await fetch(LLM_ENDPOINT, {
method: 'POST',
body: JSON.stringify({
messages: [{ role: 'user', content: INPUT_FIELDS_PROMPT + spl }],
}),
});
const data = await response.json();
const dict = JSON.parse(data.choices[0].message.content);
return Object.entries(dict).map(([rowId, fields]) => ({
rowIdentifier: rowId, fields: fields as string[]
}));
}
```

```
export async function extractValidationFields(spl: string): Promise<string[]> {
const response = await fetch(LLM_ENDPOINT, { /* similar, different prompt */ });
const data = await response.json();
return JSON.parse(data.choices[0].message.content);
}
```

**6.4 Store Actions for AI Features**
```
// In testStore.ts
```

```
setFieldExtraction: (sources: ExtractedDataSource[]) => set(draft => {
const test = active(draft);
test.fieldExtraction = { sources, timestamp: new Date().toISOString() };
}),
```

```
selectDataSource: (scenarioId, inputId, source) => set(draft => {
const input = findInput(findScenario(active(draft), scenarioId), inputId);
input.rowIdentifier = source.rowIdentifier;
input.inputMode = 'fields';
input.events = [{ id: genId(), fieldValues:
source.fields.map(f => ({ id: genId(), field: f, value: '' }))
}];
}),
```

```
applySuggestedValidationFields: (fields: string[]) => set(draft => {
const validation = active(draft).validation;
const existing = new Set(validation.fieldConditions.map(fc => fc.field));
for (const field of fields) {
if (!existing.has(field)) {
validation.fieldConditions.push({
id: genId(), field, operator: 'not_empty', value: '', scenarioScope: 'all'
});
}
}
}),
```