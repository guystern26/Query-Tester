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
  ResponseMessage, SplWarning, SplAnalysis,
  ValidationDetail, ScenarioResult, TestResponse,
} from './results';

// Re-export scheduled types
export type {
  ScheduledTest, TestRunRecord,
} from './scheduled';

// ─── Imports needed for interfaces below ────────────────────────────────────
import type { EntityId, TestType, ValidationType, ResultCountOperator } from './base';
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

// ─── Query Data Config (sub-query input mode) ───────────────────────────────

export interface QueryDataConfig {
  spl: string;
  savedSearchName: string | null;
  timeRange: TimeRange;
}

// ─── Test Input (4.3) ────────────────────────────────────────────────────────

export interface TestInput {
  id: EntityId;
  rowIdentifier: string;
  inputMode: 'json' | 'fields' | 'no_events' | 'query_data';
  jsonContent: string;
  events: InputEvent[];
  fileRef: { name: string; size: number } | null;
  generatorConfig: GeneratorConfig;
  queryDataConfig: QueryDataConfig;
  /** Cached sample values from Splunk/LLM, keyed by field name. */
  sampleValues?: Record<string, string>;
}

// ─── Scenario (4.3) ────────────────────────────────────────────────────────

export interface Scenario {
  id: EntityId;
  name: string;
  description: string;
  inputs: TestInput[];
}

// ─── Time Range ────────────────────────────────────────────────────────────

export interface TimeRange {
  earliest: string;
  latest: string;
  label: string;
}

// ─── Query (4.3) ───────────────────────────────────────────────────────────

export interface QueryConfig {
  spl: string;
  savedSearchOrigin: string | null;
  timeRange: TimeRange;
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
  suggestedValidationFields?: string[];
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


// ─── Test Library (saved tests) ─────────────────────────────────────────────

export interface SavedTestMeta {
  id: EntityId;
  name: string;
  app: string;
  testType: TestType;
  validationType: ValidationType;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  scenarioCount: number;
  description: string;
  version: number;
  savedSearchOrigin?: string | null;
}

export interface SavedTestFull extends SavedTestMeta {
  definition: TestDefinition;
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
