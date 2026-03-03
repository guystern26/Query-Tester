### 8. Payload Alignment

State = Save File = API Payload. Only UI-only fields stripped.

**8.1 The Payload Builder**
```
function buildPayload(test: TestDefinition): ApiPayload {
return {
testName: test.name,
app: test.app,
testType: test.testType,
query: test.query.spl,
scenarios: test.testType === 'query_only' ? undefined
: test.scenarios.map(s => ({
name: s.name,
inputs: s.inputs.map(input => ({
rowIdentifier: input.rowIdentifier,
events: buildEventsForInput(input),
generatorConfig: input.generatorConfig.enabled
? input.generatorConfig : undefined,
})),
})),
validation: {
validationType: test.validation.validationType,
approach: test.validation.approach,
expectedResult: test.validation.approach === 'expected_result'
? JSON.parse(test.validation.expectedResultJson || 'null') : null,
fieldConditions: test.validation.approach === 'field_conditions'
? test.validation.fieldConditions.map(fc => ({
field: fc.field, operator: fc.operator,
value: fc.value, scenarioScope: fc.scenarioScope,
})) : null,
resultCount: test.validation.resultCount.enabled
? test.validation.resultCount : null,
},
};
}
```