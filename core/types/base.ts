/**
 * Foundation types — IDs, enums, and union types used across the data model.
 */

export type EntityId = string;

export type TestType = 'standard' | 'query_only';
export type ValidationType = 'standard' | 'ijump_alert';
export type InputMode = 'json' | 'fields' | 'no_events';
export type ConditionOperator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
  | 'is_empty' | 'is_not_empty' | 'is_timestamp'
  | 'regex' | 'in_list' | 'not_in_list';
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
