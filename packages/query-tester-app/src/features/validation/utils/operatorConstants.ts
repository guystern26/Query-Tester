import type { ConditionOperator } from 'core/types';

export const VALUELESS_OPS = new Set<ConditionOperator>(['is_empty', 'is_not_empty', 'is_timestamp']);

export const OP_GROUPS: Array<{ label: string; ops: Array<{ value: ConditionOperator; label: string }> }> = [
  { label: 'Equality', ops: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
  ]},
  { label: 'Text', ops: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
  ]},
  { label: 'Numeric', ops: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_or_equal', label: 'Greater or equal' },
    { value: 'less_or_equal', label: 'Less or equal' },
  ]},
  { label: 'Check', ops: [
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
    { value: 'is_timestamp', label: 'Is timestamp' },
  ]},
  { label: 'Advanced', ops: [
    { value: 'regex', label: 'Regex' },
    { value: 'in_list', label: 'In list' },
    { value: 'not_in_list', label: 'Not in list' },
  ]},
];

export const OP_LABELS: Record<string, string> = {
  equals: '=', not_equals: '!=', contains: 'contains', not_contains: 'not contains',
  starts_with: 'starts with', ends_with: 'ends with',
  greater_than: '>', less_than: '<', greater_or_equal: '>=', less_or_equal: '<=',
  is_empty: 'is empty', is_not_empty: 'is not empty', is_timestamp: 'is timestamp',
  regex: 'matches regex', in_list: 'in list', not_in_list: 'not in list',
};
