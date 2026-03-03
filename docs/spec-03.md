### 3. Key Architectural Decisions

**4.1 testType: 2 Modes Only**
```
type TestType = 'standard' | 'query_only';
type ValidationType = 'standard' | 'ijump_alert';
```
iJump Alert is a validation type, not a test type. The test structure (inputs + query) is identical. Only the validation UI differs: iJump locks fields to 'reason' and 'status' with orange theme.

**4.2 combinationMode: Removed**
All scenarios belong to one test. They all execute as part of a single API call. The backend runs each scenario's inputs against the query separately. No cartesian product. No combination logic. Each scenario runs independently within the same global test.

**4.3 App Field on TestDefinition**
The selected Splunk app determines available saved searches. Stored on TestDefinition so save/load preserves it and the backend knows which app context to use.

**3.4 Saved Search Flow**
There is no manual/saved_search mode toggle. The SPL editor is always visible. The SavedSearchPicker is a helper dropdown that:
Fetches saved searches scoped to the selected app.
When user picks one, calls splunkApi.getSavedSearchSpl(app, name).
Loads the returned SPL into the editor for free editing.
Stores savedSearchOrigin for reference (where did this query come from).
The actual SPL text is always what gets sent to the backend.

**3.5 Validation Scoping**
Each FieldCondition has scenarioScope: 'all' | EntityId[]. User chooses per condition whether it applies to all scenarios or specific ones via multi-select.

**3.6 No CSV Support**
File uploads accept .json files only. The CSV parsing logic (parseCSVLine, etc.) is removed entirely. JSON files are validated with JSON.parse() on upload.