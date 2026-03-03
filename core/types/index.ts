/**
 * Unified data model types — Splunk Query Tester.
 * See spec sections 2 (React 16), 3 (Key Decisions), 4 (Data Model), 13 (Results), 14 (Errors).
 */

// Re-export foundation types
export type {
  EntityId, TestType, ValidationType, InputMode,
  ConditionOperator, ResultCountOperator, ResponseMessageSeverity, GeneratorType,
} from './base';

// Re-export generator types
export type {
  NumberedGeneratorConfig, PickListItem, PickListGeneratorConfig,
  RandomNumberVariant, RandomNumberGeneratorConfig,
  UniqueIdFormat, UniqueIdVariant, UniqueIdGeneratorConfig,
  EmailComponentType, EmailVariant, EmailGeneratorConfig,
  IpType, IpAddressVariant, IpAddressGeneratorConfig,
  GeneralComponentType, GeneralFieldVariant, GeneralFieldGeneratorConfig,
  FieldGenerationRule, GeneratorConfig,
} from './generator';

// Re-export result types
export type {
  ResponseMessage, QueryInfo, TestResultSummary,
  FieldValidationResult, EventValidationResult,
  InputResult, ScenarioResult, TestResponse,
} from './results';

// ─── Imports needed for interfaces below ────────────────────────────────────
import type { EntityId, ValidationType, ResultCountOperator } from './base';
import type { GeneratorConfig } from './generator';
import type { TestResponse } from './results';

// ─── Field & Event (4.3) ────────────────────────────────────────────────────

export interface FieldValue {
  id: EntityId;
  field: string;
  value: string;
}

export interface InputEvent {
  id: EntityId;
  fieldValues: FieldValue[];
}

// ─── Test Input (4.3) ────────────────────────────────────────────────────────

export interface TestInput {
  id: EntityId;
  rowIdentifier: string;
  inputMode: 'json' | 'fields' | 'no_events';
  jsonContent: string;
  events: InputEvent[];
  fileRef: { name: string; size: number } | null;
  generatorConfig: GeneratorConfig;
}

// ─── Scenario (4.3) ────────────────────────────────────────────────────────

export interface Scenario {
  id: EntityId;
  name: string;
  description: string;
  inputs: TestInput[];
}

// ─── Query (4.3) ───────────────────────────────────────────────────────────

export interface QueryConfig {
  spl: string;
  savedSearchOrigin: string | null;
}

// ─── Validation (4.3) ───────────────────────────────────────────────────────

export type ValidationScope = 'all_events' | 'any_event' | 'exactly_n' | 'at_least_n' | 'at_most_n';

export interface SingleCondition {
  id: EntityId;
  operator: import('./base').ConditionOperator;
  value: string;
}

export interface FieldConditionGroup {
  id: EntityId;
  field: string;
  conditions: SingleCondition[];
  conditionLogic: 'and' | 'or';
  scenarioScope: 'all' | EntityId[];
}

export interface ResultCountRule {
  enabled: boolean;
  operator: ResultCountOperator;
  value: number;
}

export interface ValidationConfig {
  validationType: ValidationType;
  approach: 'expected_result' | 'field_conditions';
  expectedResultJson: string;
  expectedResultFileRef: { name: string; size: number } | null;
  fieldGroups: FieldConditionGroup[];
  fieldLogic: 'and' | 'or';
  validationScope: ValidationScope;
  scopeN: number | null;
  resultCount: ResultCountRule;
}

// ─── Test Definition (4.3) ──────────────────────────────────────────────────

export interface TestDefinition {
  id: EntityId;
  name: string;
  app: string;
  testType: import('./base').TestType;
  scenarios: Scenario[];
  query: QueryConfig;
  validation: ValidationConfig;
  /** AI extraction result (section 6.1). Stored on test for save/load. */
  fieldExtraction?: FieldExtraction;
}

// ─── AI extraction (6.1) ────────────────────────────────────────────────────

export interface ExtractedDataSource {
  rowIdentifier: string;
  fields: string[];
}

export interface FieldExtraction {
  sources: ExtractedDataSource[];
  timestamp: string;
}

// ─── Bug Report (spec 15) ───────────────────────────────────────────────────

/** Payload for bug/feature report export and mailto. */
export interface BugReportPayload {
  reportGeneratedAt: string;
  reportType: 'bug' | 'feature';
  description: string;
  currentTest: TestDefinition;
  allTests?: TestDefinition[];
  testResponse?: TestResponse | null;
}
