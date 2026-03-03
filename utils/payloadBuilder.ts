/**
 * Payload builder for run_test API. Spec 8.1, 5.4.
 */

import type { TestDefinition, TestInput } from '../core/types';

export function buildEventsForInput(input: TestInput): Record<string, string>[] {
  if (input.inputMode === 'no_events') return [{}];
  if (input.inputMode === 'json') {
    try {
      const parsed = JSON.parse(input.jsonContent || '[]');
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [{}];
    }
  }
  return input.events.map((evt) => {
    const pairs = evt.fieldValues.filter((fv) => fv.field.trim() !== '');
    if (pairs.length === 0) return {};
    return Object.fromEntries(pairs.map((fv) => [fv.field, fv.value]));
  });
}

export interface ApiPayload {
  testName: string;
  app: string;
  testType: TestDefinition['testType'];
  query: string;
  scenarios?: Array<{
    name: string;
    inputs: Array<{
      rowIdentifier: string;
      events: Record<string, string>[];
      generatorConfig?: TestInput['generatorConfig'];
    }>;
  }>;
  validation: {
    validationType: TestDefinition['validation']['validationType'];
    approach: TestDefinition['validation']['approach'];
    expectedResult: unknown;
    fieldConditions: Array<{
      field: string;
      operator: string;
      value: string;
      scenarioScope: 'all' | string[];
    }> | null;
    resultCount: TestDefinition['validation']['resultCount'] | null;
  };
}

export function buildPayload(test: TestDefinition): ApiPayload {
  return {
    testName: test.name || 'Untitled Test',
    app: test.app,
    testType: test.testType,
    query: test.query.spl,
    scenarios:
      test.testType === 'query_only'
        ? undefined
        : test.scenarios.map((s) => ({
            name: s.name || 'Scenario 1',
            inputs: s.inputs.map((input) => ({
              rowIdentifier: input.rowIdentifier,
              events: buildEventsForInput(input),
              generatorConfig: input.generatorConfig.enabled
                ? input.generatorConfig
                : undefined,
            })),
          })),
    validation: {
      validationType: test.validation.validationType,
      approach: test.validation.approach,
      expectedResult:
        test.validation.approach === 'expected_result'
          ? (() => {
              try {
                return JSON.parse(test.validation.expectedResultJson || 'null');
              } catch {
                return null;
              }
            })()
          : null,
      fieldConditions:
        test.validation.approach === 'field_conditions'
          ? test.validation.fieldConditions.map((fc) => ({
              field: fc.field,
              operator: fc.operator,
              value: fc.value,
              scenarioScope: fc.scenarioScope,
            }))
          : null,
      resultCount: test.validation.resultCount.enabled
        ? test.validation.resultCount
        : null,
    },
  };
}
