/**
 * Response & result types — spec sections 13, 14.
 */
import type { EntityId, TestType, ValidationType, ResponseMessageSeverity } from './base';

// ─── Response / Results ─────────────────────────────────────────────────────

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
