/**
 * Mock interceptor — returns realistic TestResponse based on the current TestDefinition.
 * TODO: Replace mockRunTest with real API call: testApi.runTest(buildPayload(test))
 */

import type {
  TestDefinition,
  TestResponse,
  ScenarioResult,
  InputResult,
  EventValidationResult,
  FieldValidationResult,
  ResponseMessage,
  TestResultSummary,
  QueryInfo,
} from 'core/types';

function mockFieldValidation(
  field: string,
  operator: string,
  value: string,
): FieldValidationResult {
  const passed = Math.random() > 0.3;
  const actual = passed
    ? value
    : operator === 'greater_than' ? String(Number(value) - 10)
    : operator === 'equals' ? 'unexpected_value'
    : 'mismatch';

  return {
    field,
    passed,
    expected: value,
    actual,
    message: passed
      ? `Field "${field}" matches expected value`
      : `Expected ${operator} "${value}" but got "${actual}"`,
  };
}

export async function mockRunTest(
  test: TestDefinition,
  signal?: AbortSignal,
): Promise<TestResponse> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 2000);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });

  const conditions = test.validation.fieldGroups.flatMap((g) =>
    g.conditions.map((c) => ({
      field: g.field,
      operator: c.operator,
      value: c.value,
      scenarioScope: g.scenarioScope,
    })),
  );

  const scenarioResults: ScenarioResult[] = test.scenarios.map((scenario, si) => {
    const inputResults: InputResult[] = scenario.inputs.map((input) => {
      const events = input.events.length > 0 ? input.events : [{ id: '', fieldValues: [] }];

      const eventResults: EventValidationResult[] = events.map((_evt, ei) => {
        const scoped = conditions.filter(
          (fc) => fc.scenarioScope === 'all' ||
            (Array.isArray(fc.scenarioScope) && fc.scenarioScope.includes(scenario.id)),
        );
        const fieldValidations = scoped.map((fc) =>
          mockFieldValidation(fc.field, fc.operator, fc.value),
        );
        return {
          eventIndex: ei,
          passed: fieldValidations.every((fv) => fv.passed),
          fieldValidations,
        };
      });

      return {
        inputId: input.id,
        passed: eventResults.every((er) => er.passed),
        eventsValidated: eventResults.length,
        eventsPassed: eventResults.filter((er) => er.passed).length,
        eventResults,
        executionTimeMs: Math.floor(Math.random() * 500) + 100,
      };
    });

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name || `Scenario ${si + 1}`,
      passed: inputResults.every((ir) => ir.passed),
      inputsProcessed: inputResults.length,
      inputsPassed: inputResults.filter((ir) => ir.passed).length,
      inputResults,
    };
  });

  const passedScenarios = scenarioResults.filter((sr) => sr.passed).length;
  const totalScenarios = scenarioResults.length;
  const allPassed = passedScenarios === totalScenarios;

  const warnings: ResponseMessage[] = [];
  if (Math.random() > 0.5) {
    warnings.push({
      code: 'JOIN_LIMIT',
      message: 'Join limited to 50,000 results. Some data may be truncated.',
      severity: 'warning',
      source: 'join',
      line: 3,
      tip: 'Consider using append with stats instead of join for large datasets.',
    });
  }
  if (Math.random() > 0.7) {
    warnings.push({
      code: 'SUBSEARCH_LIMIT',
      message: 'Subsearch returned maximum of 10,000 results.',
      severity: 'caution',
      source: 'subsearch',
      tip: 'Add | head 10000 explicitly to control subsearch limits.',
    });
  }

  const errors: ResponseMessage[] = [];
  if (!allPassed && Math.random() > 0.8) {
    errors.push({
      code: 'FIELD_NOT_FOUND',
      message: 'Field "nonexistent_field" not found in results.',
      severity: 'error',
      source: 'stats',
      line: 2,
      tip: 'Check field names are correct. Use | fieldsummary to see available fields.',
    });
  }

  const summary: TestResultSummary = {
    totalScenarios,
    passedScenarios,
    failedScenarios: totalScenarios - passedScenarios,
    totalInputs: scenarioResults.reduce((sum, sr) => sum + sr.inputsProcessed, 0),
    totalEvents: scenarioResults.reduce(
      (sum, sr) => sum + sr.inputResults.reduce((s, ir) => s + ir.eventsValidated, 0), 0,
    ),
    validationType: test.validation.validationType,
  };

  const queryInfo: QueryInfo = {
    executedQuery: test.query.spl || 'index=main | stats count by host',
    executionTimeMs: Math.floor(Math.random() * 3000) + 500,
    resultCount: Math.floor(Math.random() * 100) + 1,
    scanCount: Math.floor(Math.random() * 50000) + 1000,
    earliestTime: new Date(Date.now() - 86400000).toISOString(),
    latestTime: new Date().toISOString(),
  };

  const status = errors.length > 0 ? 'error' : allPassed ? 'success' : 'partial';

  return {
    status,
    message: allPassed
      ? `All ${totalScenarios} scenarios passed`
      : `${passedScenarios} of ${totalScenarios} scenarios passed`,
    testName: test.name || 'Untitled Test',
    testType: test.testType,
    timestamp: new Date().toISOString(),
    executionTimeMs: queryInfo.executionTimeMs + 200,
    errors,
    warnings,
    queryInfo,
    summary,
    scenarioResults,
  };
}
