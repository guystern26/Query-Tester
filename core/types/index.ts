/**
 * Unified data model types — Splunk Query Tester.
 * See spec sections 2 (React 16), 3 (Key Decisions), 4 (Data Model), 13 (Results), 14 (Errors).
 */

// ─── IDs & Enums (4.1) ─────────────────────────────────────────────────────

export type EntityId = string;

export type TestType = 'standard' | 'query_only';
export type ValidationType = 'standard' | 'ijump_alert';
export type InputMode = 'json' | 'fields' | 'no_events';
export type ConditionOperator = 'equals' | 'contains' | 'regex' | 'not_empty';
export type ResultCountOperator = 'equals' | 'greater_than' | 'less_than';

export type ResponseMessageSeverity = 'fatal' | 'error' | 'warning' | 'caution' | 'info';

/** Generator rule type (section 17.6 backend). */
export type GeneratorType =
  | 'numbered'
  | 'pick_list'
  | 'random_number'
  | 'unique_id'
  | 'email'
  | 'ip_address'
  | 'general_field';

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

// ─── Generator (payload + spec 17.6) ────────────────────────────────────────

export interface FieldGenerationRule {
  id: EntityId;
  field: string;
  type: GeneratorType;
  /** Type-specific config: items (pick_list), variants (weighted), min/max/decimals (random_number), etc. */
  config: Record<string, unknown>;
}

export interface GeneratorConfig {
  enabled: boolean;
  eventCount?: number;
  rules: FieldGenerationRule[];
}

// ─── Test Input (4.3) ────────────────────────────────────────────────────────

export interface TestInput {
  id: EntityId;
  rowIdentifier: string;
  inputMode: InputMode;
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

export interface FieldCondition {
  id: EntityId;
  field: string;
  operator: ConditionOperator;
  value: string;
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
  fieldConditions: FieldCondition[];
  resultCount: ResultCountRule;
}

// ─── Test Definition (4.3) ──────────────────────────────────────────────────

export interface TestDefinition {
  id: EntityId;
  name: string;
  app: string;
  testType: TestType;
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

// ─── Response / Results (13, 14) ───────────────────────────────────────────

export interface ResponseMessage {
  code: string;
  message: string;
  severity: ResponseMessageSeverity;
  source?: string;
  line?: number;
  tip?: string;
}

export interface QueryInfo {
  executedQuery: string;
  executionTimeMs: number;
  resultCount: number;
  scanCount: number;
  earliestTime?: string;
  latestTime?: string;
}

export interface TestResultSummary {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  totalInputs: number;
  totalEvents: number;
  validationType: ValidationType;
}

export interface FieldValidationResult {
  field: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  message?: string;
}

export interface EventValidationResult {
  eventIndex: number;
  passed: boolean;
  fieldValidations: FieldValidationResult[];
  error?: string;
}

export interface InputResult {
  inputId: EntityId;
  passed: boolean;
  eventsValidated: number;
  eventsPassed: number;
  eventResults: EventValidationResult[];
  executionTimeMs?: number;
  error?: string;
}

export interface ScenarioResult {
  scenarioId: EntityId;
  scenarioName: string;
  passed: boolean;
  inputsProcessed: number;
  inputsPassed: number;
  inputResults: InputResult[];
}

export interface TestResponse {
  status: 'success' | 'error' | 'partial';
  message: string;
  testName: string;
  testType: TestType;
  timestamp: string;
  executionTimeMs: number;
  errors: ResponseMessage[];
  warnings: ResponseMessage[];
  queryInfo: QueryInfo | null;
  summary: TestResultSummary | null;
  scenarioResults: ScenarioResult[];
}

/** Payload for bug/feature report export and mailto. Spec 15. */
export interface BugReportPayload {
  reportGeneratedAt: string;
  reportType: 'bug' | 'feature';
  description: string;
  currentTest: TestDefinition;
  allTests?: TestDefinition[];
  testResponse?: TestResponse | null;
}
