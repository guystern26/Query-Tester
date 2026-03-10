/**
 * Factory functions for empty/default entities. Empty values only — no default names or data.
 * Spec 2.5: ID via crypto.randomUUID().
 */

import type {
  EntityId,
  TestDefinition,
  Scenario,
  TestInput,
  InputEvent,
  QueryConfig,
  TimeRange,
  ValidationConfig,
  ResultCountRule,
  GeneratorConfig,
  QueryDataConfig,
  SingleCondition,
  FieldConditionGroup,
} from '../types';

/** Generates a new EntityId (crypto.randomUUID()). Node 18 fallback via require('crypto').randomUUID(). */
export function genId(): EntityId {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Node 18 fallback (e.g. tests)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = (globalThis as any).require?.('crypto') as { randomUUID?: () => string } | undefined;
    if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') {
      return nodeCrypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createDefaultEvent(): InputEvent {
  return {
    id: genId(),
    fieldValues: [{ id: genId(), field: '', value: '' }],
  };
}

export function createDefaultQueryDataConfig(): QueryDataConfig {
  return {
    spl: '',
    savedSearchName: null,
    timeRange: { ...DEFAULT_TIME_RANGE },
  };
}

export function createDefaultInput(): TestInput {
  return {
    id: genId(),
    rowIdentifier: '',
    inputMode: 'fields',
    jsonContent: '',
    events: [createDefaultEvent()],
    fileRef: null,
    generatorConfig: createDefaultGeneratorConfig(),
    queryDataConfig: createDefaultQueryDataConfig(),
  };
}

export function createDefaultScenario(): Scenario {
  return {
    id: genId(),
    name: '',
    description: '',
    inputs: [createDefaultInput()],
  };
}

export const DEFAULT_TIME_RANGE: TimeRange = {
  earliest: '-24h@h',
  latest: 'now',
  label: 'Last 24 hours',
};

export function createDefaultQueryConfig(): QueryConfig {
  return {
    spl: '',
    savedSearchOrigin: null,
    timeRange: { ...DEFAULT_TIME_RANGE },
  };
}

function createDefaultResultCountRule(): ResultCountRule {
  return {
    enabled: false,
    operator: 'equals',
    value: 0,
  };
}

export function createDefaultSingleCondition(): SingleCondition {
  return { id: genId(), operator: 'is_not_empty', value: '' };
}

export function createDefaultFieldGroup(): FieldConditionGroup {
  return {
    id: genId(),
    field: '',
    conditions: [createDefaultSingleCondition()],
    conditionLogic: 'and',
    scenarioScope: 'all',
  };
}

export function createDefaultValidationConfig(): ValidationConfig {
  return {
    validationType: 'standard',
    fieldGroups: [],
    fieldLogic: 'and',
    validationScope: 'all_events',
    scopeN: null,
    resultCount: createDefaultResultCountRule(),
  };
}

function createDefaultGeneratorConfig(): GeneratorConfig {
  return {
    enabled: false,
    rules: [],
  };
}

export function createDefaultTest(): TestDefinition {
  return {
    id: genId(),
    name: '',
    app: '',
    testType: 'standard',
    scenarios: [createDefaultScenario()],
    query: createDefaultQueryConfig(),
    validation: createDefaultValidationConfig(),
  };
}
