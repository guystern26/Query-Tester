/**
 * Mock interceptor — returns realistic TestResponse matching the backend shape.
 * TODO: Replace mockRunTest with real API call: testApi.runTest(buildPayload(test))
 */

import type {
  TestDefinition,
  TestResponse,
  ScenarioResult,
  ValidationDetail,
  SplWarning,
  SplAnalysis,
} from 'core/types';

function mockValidation(
  field: string,
  condition: string,
  value: string,
): ValidationDetail {
  const passed = Math.random() > 0.3;
  const actual = passed
    ? value
    : condition === 'greater_than' ? String(Number(value) - 10)
    : condition === 'equals' ? 'unexpected_value'
    : 'mismatch';

  return {
    field,
    condition,
    expected: value,
    actual,
    passed,
    message: passed
      ? field + ' ' + condition + ' ' + JSON.stringify(value) + ' \u2713'
      : field + ' ' + condition + ' ' + JSON.stringify(value) + ' \u2014 got ' + JSON.stringify(actual) + ' \u2717',
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
      condition: c.operator,
      value: c.value,
      scenarioScope: g.scenarioScope,
    })),
  );

  const scenarioResults: ScenarioResult[] = test.scenarios.map((scenario, si) => {
    const scoped = conditions.filter(
      (fc) => fc.scenarioScope === 'all' ||
        (Array.isArray(fc.scenarioScope) && fc.scenarioScope.includes(scenario.id)),
    );
    const validations = scoped.map((fc) =>
      mockValidation(fc.field, fc.condition, fc.value),
    );
    const passed = validations.length === 0 || validations.every((v) => v.passed);

    return {
      scenarioName: scenario.name || 'Scenario ' + (si + 1),
      passed,
      executionTimeMs: Math.floor(Math.random() * 2000) + 200,
      resultCount: Math.floor(Math.random() * 50) + 1,
      injectedSpl: test.query.spl + ' | where run_id="mock_' + (si + 1) + '"',
      validations,
      resultRows: [],
      error: null,
    };
  });

  const passedScenarios = scenarioResults.filter((sr) => sr.passed).length;
  const totalScenarios = scenarioResults.length;
  const allPassed = passedScenarios === totalScenarios;

  const warnings: SplWarning[] = [];
  if (Math.random() > 0.5) {
    warnings.push({
      message: 'Join limited to 50,000 results. Some data may be truncated.',
      severity: 'warning',
    });
  }

  const splAnalysis: SplAnalysis = {
    unauthorizedCommands: [],
    unusualCommands: Math.random() > 0.6 ? ['join'] : [],
    uniqLimitations: null,
    commandsUsed: ['search', 'stats', 'where'],
  };

  return {
    status: allPassed ? 'success' : 'partial',
    message: passedScenarios + '/' + totalScenarios + ' scenarios passed',
    testName: test.name || 'Untitled Test',
    testType: test.testType,
    timestamp: new Date().toISOString(),
    totalScenarios,
    passedScenarios,
    warnings,
    splAnalysis,
    scenarioResults,
  };
}
