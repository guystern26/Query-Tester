import type { FieldConditionGroup, ConditionOperator } from 'core/types';
import { genId } from 'core/constants/defaults';

export type IjumpSubMode = 'jumping' | 'monitoring';

export const IJUMP_LOCKED_FIELDS = ['_time', 'reason', 'status'] as const;

export const JUMPING_STATUS_VALUES = ['jumping', 'idle'];
export const MONITORING_STATUS_VALUES = ['valid', 'warning', 'error'];

export const REASON_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'regex', label: 'Regex' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

export function isIJumpLockedField(fieldName: string): boolean {
  return (IJUMP_LOCKED_FIELDS as readonly string[]).includes(fieldName);
}

function statusValues(subMode: IjumpSubMode): string[] {
  return subMode === 'jumping' ? JUMPING_STATUS_VALUES : MONITORING_STATUS_VALUES;
}

/** Build the 3 base iJump field groups for _time, reason, status. */
export function createIJumpBaseGroups(subMode: IjumpSubMode): FieldConditionGroup[] {
  return [
    {
      id: genId(), field: '_time',
      conditions: [{ id: genId(), operator: 'is_not_empty', value: '' }],
      conditionLogic: 'and', scenarioScope: 'all',
    },
    {
      id: genId(), field: 'reason',
      conditions: [{ id: genId(), operator: 'is_not_empty', value: '' }],
      conditionLogic: 'and', scenarioScope: 'all',
    },
    {
      id: genId(), field: 'status',
      conditions: statusValues(subMode).map((val) => ({
        id: genId(), operator: 'equals' as ConditionOperator, value: val,
      })),
      conditionLogic: 'or', scenarioScope: 'all',
    },
  ];
}

/**
 * Replace status group conditions with new sub-mode values.
 * Preserves _time, reason, and custom groups.
 */
export function updateIJumpSubMode(
  existing: FieldConditionGroup[],
  newSubMode: IjumpSubMode,
): FieldConditionGroup[] {
  return existing.map((g) => {
    if (g.field !== 'status') return g;
    return {
      ...g,
      conditions: statusValues(newSubMode).map((val) => ({
        id: genId(), operator: 'equals' as ConditionOperator, value: val,
      })),
    };
  });
}

/** Detect current sub-mode from existing status group. */
export function detectSubMode(groups: FieldConditionGroup[]): IjumpSubMode {
  const statusGroup = groups.find((g) => g.field === 'status');
  if (!statusGroup) return 'jumping';
  const vals = statusGroup.conditions.map((c) => c.value);
  return vals.includes('jumping') || vals.includes('idle') ? 'jumping' : 'monitoring';
}
