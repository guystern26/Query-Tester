import type { FieldConditionGroup } from 'core/types';
import { OP_LABELS, VALUELESS_OPS } from './utils/operatorConstants';

export function conditionPreview(group: FieldConditionGroup): string {
  if (!group.field.trim()) return '';
  const parts = group.conditions.map((c) => {
    const op = OP_LABELS[c.operator] ?? c.operator;
    if (VALUELESS_OPS.has(c.operator)) return `${group.field} ${op}`;
    const val = c.value.trim() ? `"${c.value}"` : '?';
    return `${group.field} ${op} ${val}`;
  });
  const logic = group.conditionLogic === 'or' ? ' OR ' : ' AND ';
  return parts.join(logic);
}
