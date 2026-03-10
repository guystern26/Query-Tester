/**
 * Payload builder for run_test API. Spec 8.1, 5.4.
 */

import type { TestDefinition, TestInput } from 'core/types';

export function buildEventsForInput(input: TestInput): Record<string, string>[] {
  if (input.inputMode === 'no_events' || input.inputMode === 'query_data') return [];
  if (input.inputMode === 'json') {
    try {
      const parsed = JSON.parse(input.jsonContent || '[]');
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return input.events.map((evt) => {
    const pairs = evt.fieldValues.filter((fv) => fv.field.trim() !== '');
    if (pairs.length === 0) return {};
    return Object.fromEntries(pairs.map((fv) => [fv.field, fv.value ?? '']));
  });
}

export interface ApiPayload {
  testName: string;
  app: string;
  testType: TestDefinition['testType'];
  query: string;
  earliestTime: string;
  latestTime: string;
  scenarios?: Array<{
    name: string;
    inputs: Array<{
      rowIdentifier: string;
      inputMode: string;
      events: Record<string, string>[];
      generatorConfig?: {
        enabled: boolean;
        eventCount?: number;
        rules: Array<{
          id: string;
          fieldName: string;
          generationType: string;
          config: Record<string, unknown>;
        }>;
      };
      queryDataConfig?: {
        spl: string;
        earliestTime: string;
        latestTime: string;
      };
    }>;
  }>;
  validation: {
    validationType: TestDefinition['validation']['validationType'];
    fieldConditions: Array<{
      field: string;
      operator: string;
      value: string;
      scenarioScope: 'all' | string[];
    }>;
    fieldGroups: Array<{
      field: string;
      conditionLogic: 'and' | 'or';
      scenarioScope: 'all' | string[];
      conditions: Array<{ operator: string; value: string }>;
    }>;
    fieldLogic: 'and' | 'or';
    validationScope: string;
    scopeN: number | null;
    resultCount: TestDefinition['validation']['resultCount'] | null;
  };
}

export function buildPayload(test: TestDefinition): ApiPayload {
  return {
    testName: test.name || 'Untitled Test',
    app: test.app,
    testType: test.testType,
    query: test.query.spl,
    earliestTime: test.query.timeRange.earliest,
    latestTime: test.query.timeRange.latest,
    scenarios:
      test.testType === 'query_only'
        ? undefined
        : test.scenarios.map((s) => ({
            name: s.name || 'Scenario 1',
            inputs: s.inputs.map((input) => ({
              rowIdentifier: input.rowIdentifier,
              inputMode: input.inputMode,
              events: buildEventsForInput(input),
              generatorConfig: input.generatorConfig.enabled
                ? {
                    enabled: input.generatorConfig.enabled,
                    eventCount: input.generatorConfig.eventCount,
                    rules: input.generatorConfig.rules.map((r) => ({
                      id: r.id,
                      fieldName: r.field,
                      generationType: r.type,
                      config: r.config,
                    })),
                  }
                : undefined,
              queryDataConfig: input.inputMode === 'query_data' && input.queryDataConfig.spl.trim()
                ? {
                    spl: input.queryDataConfig.spl,
                    earliestTime: input.queryDataConfig.timeRange.earliest,
                    latestTime: input.queryDataConfig.timeRange.latest,
                  }
                : undefined,
            })),
          })),
    validation: {
      validationType: test.validation.validationType,
      fieldConditions: test.validation.fieldGroups.flatMap((g) =>
        g.conditions.map((c) => ({
          field: g.field,
          operator: c.operator,
          value: c.value,
          scenarioScope: g.scenarioScope,
        }))
      ),
      fieldGroups: test.validation.fieldGroups.map((g) => ({
        field: g.field,
        conditionLogic: g.conditionLogic,
        scenarioScope: g.scenarioScope,
        conditions: g.conditions.map((c) => ({ operator: c.operator, value: c.value })),
      })),
      fieldLogic: test.validation.fieldLogic,
      validationScope: test.validation.validationScope,
      scopeN: test.validation.scopeN,
      resultCount: test.validation.resultCount.enabled
        ? test.validation.resultCount
        : null,
    },
  };
}
