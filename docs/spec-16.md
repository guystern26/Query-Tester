### 16. Backend Context (Reference)

*This section documents backend architecture for context. It is not part of the frontend implementation but gives the next developer a full picture of how the system works end-to-end.*

**17.1 Query Processing Pipeline**
When the frontend sends a test payload, the backend processes it through these stages:

```
1. Normalize   → Clean up newlines, whitespace, formatting
2. Safety      → Block dangerous commands (outputlookup, collect, delete,
sendemail, dbxquery, kvstore, outputcsv)
3. Inject Data → Replace row identifiers with test data (makeresults or HEC)
4. Execute     → Run the modified query via Splunk REST API
5. Validate    → Check results against validation config
6. Respond     → Build TestResponse with results, errors, warnings
```

**17.2 Data Injection: Two Methods**

**Method A: makeresults (default, small datasets)**
Converts the input events into SPL makeresults commands. The row identifier in the query (e.g., 'index=main sourcetype=access') is replaced with the generated makeresults string. Handles subsearches, joins, and lookups. Best for small datasets (< 100 events per input).

**Method B: HEC Indexing (large datasets)**
For large or deeply nested datasets that don't fit in makeresults, the backend indexes events via HEC (HTTP Event Collector) into a temporary index (query_tester_temp). Each test run gets a unique scenario_id field. The query's row identifier is replaced with 'index=query_tester_temp scenario_id=<unique_id>'. The temp index has 1-day retention. Events are batched (up to 5000 per HEC request) and flattened to single-line JSON.

**17.3 Row Identifier Replacement**
The injector replaces the ENTIRE row identifier string (not just 'index='), including sourcetype= or any other text. This handles edge cases like 'index=main sourcetype=access' appearing in both the main query and subsearches. All occurrences are replaced.

**17.4 Dangerous Command Blocking**
Before execution, the safety validator scans for commands that modify production data:
```
BLOCKED: outputlookup, collect, delete, sendemail, dbxquery, kvstore, outputcsv
```
Commands in quoted strings are ignored (e.g., eval msg="please delete" is safe). Commands in subsearches are still blocked. The validator returns a warning with the command name, description, severity, and line number — using the same ResponseMessage format.

**17.5 Event Generator Backend**
The event generator runs server-side in Python. It reads the generatorConfig from each input and builds SPL eval expressions using case() statements for weighted variant selection. Generator types: numbered (flat config), pick_list (items[]), random_number, unique_id, email, ip_address, general_field (all use variants[] with weights). Weights are automatically normalized to sum to 100.

**17.6 Validation Engine**
Backend validation uses 4 Python files in a validation/ directory: enums.py (operators, types), validation_dataclasses.py (condition/rule structures), validation_methods.py (comparison logic), validator_engine.py (orchestration). Supports per-scenario scoping via scenarioScope on each FieldCondition. Results are returned per-event, per-input, per-scenario.