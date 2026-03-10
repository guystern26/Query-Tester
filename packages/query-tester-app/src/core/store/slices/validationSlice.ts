/**
 * Validation slice — group-based field conditions.
 */

import type {
  EntityId,
  TestDefinition,
  ValidationType,
  ValidationScope,
  ConditionOperator,
  ResultCountOperator,
  FieldConditionGroup,
  SingleCondition,
} from '../../types';
import { genId, createDefaultFieldGroup, createDefaultSingleCondition } from '../../constants/defaults';
import { MAX_FIELD_GROUPS, MAX_CONDITIONS_PER_GROUP } from '../../constants/limits';
import { findTest } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

function findGroup(test: TestDefinition, groupId: EntityId) {
  return test.validation.fieldGroups.find((g) => g.id === groupId);
}

export function validationSlice(set: SetState) {
  return {
    /* ── field group CRUD ─────────────────────────────────── */

    addFieldGroup: (testId: EntityId, initial?: Partial<FieldConditionGroup>) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t || t.validation.fieldGroups.length >= MAX_FIELD_GROUPS) return;
        const g = createDefaultFieldGroup();
        if (initial?.field !== undefined) g.field = initial.field;
        if (initial?.conditions) g.conditions = initial.conditions;
        if (initial?.conditionLogic) g.conditionLogic = initial.conditionLogic;
        if (initial?.scenarioScope) g.scenarioScope = initial.scenarioScope;
        t.validation.fieldGroups.push(g);
      }),

    removeFieldGroup: (testId: EntityId, groupId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        const idx = t.validation.fieldGroups.findIndex((g) => g.id === groupId);
        if (idx !== -1) t.validation.fieldGroups.splice(idx, 1);
      }),

    duplicateFieldGroup: (testId: EntityId, groupId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t || t.validation.fieldGroups.length >= MAX_FIELD_GROUPS) return;
        const src = findGroup(t, groupId);
        if (!src) return;
        const idx = t.validation.fieldGroups.indexOf(src);
        const clone: FieldConditionGroup = {
          ...src,
          id: genId(),
          conditions: src.conditions.map((c) => ({ ...c, id: genId() })),
        };
        t.validation.fieldGroups.splice(idx + 1, 0, clone);
      }),

    updateFieldGroupField: (testId: EntityId, groupId: EntityId, field: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        if (g) g.field = field;
      }),

    updateFieldGroupLogic: (testId: EntityId, groupId: EntityId, logic: 'and' | 'or') =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        if (g) g.conditionLogic = logic;
      }),

    updateFieldGroupScope: (testId: EntityId, groupId: EntityId, scope: 'all' | EntityId[]) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        if (g) g.scenarioScope = scope;
      }),

    /* ── conditions within a group ────────────────────────── */

    addConditionToGroup: (testId: EntityId, groupId: EntityId, initial?: Partial<SingleCondition>) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        if (!g || g.conditions.length >= MAX_CONDITIONS_PER_GROUP) return;
        const c = createDefaultSingleCondition();
        if (initial?.operator) c.operator = initial.operator;
        if (initial?.value !== undefined) c.value = initial.value;
        g.conditions.push(c);
      }),

    removeConditionFromGroup: (testId: EntityId, groupId: EntityId, conditionId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        if (!g) return;
        const idx = g.conditions.findIndex((c) => c.id === conditionId);
        if (idx !== -1) g.conditions.splice(idx, 1);
      }),

    updateConditionInGroup: (
      testId: EntityId, groupId: EntityId, conditionId: EntityId,
      patch: Partial<Pick<SingleCondition, 'operator' | 'value'>>,
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const g = t && findGroup(t, groupId);
        const c = g?.conditions.find((x) => x.id === conditionId);
        if (!c) return;
        if (patch.operator !== undefined) c.operator = patch.operator;
        if (patch.value !== undefined) c.value = patch.value;
      }),

    /* ── top-level validation config ──────────────────────── */

    updateFieldLogic: (testId: EntityId, logic: 'and' | 'or') =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.fieldLogic = logic;
      }),

    updateValidationScope: (testId: EntityId, scope: ValidationScope, scopeN?: number | null) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        t.validation.validationScope = scope;
        if (scopeN !== undefined) t.validation.scopeN = scopeN;
      }),

    replaceAllFieldGroups: (testId: EntityId, groups: FieldConditionGroup[]) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.fieldGroups = groups;
      }),

    setValidationType: (testId: EntityId, validationType: ValidationType) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t || t.validation.validationType === validationType) return;
        t.validation.validationType = validationType;
        t.validation.fieldGroups = [];
      }),

    updateResultCount: (
      testId: EntityId,
      patch: Partial<{ enabled: boolean; operator: ResultCountOperator; value: number }>,
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        const r = t.validation.resultCount;
        if (patch.enabled !== undefined) r.enabled = patch.enabled;
        if (patch.operator !== undefined) r.operator = patch.operator;
        if (patch.value !== undefined) r.value = patch.value;
      }),

    applySuggestedValidationFields: (testId: EntityId, fields: string[]) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        const existing = new Set(t.validation.fieldGroups.map((g) => g.field));
        for (const field of fields) {
          if (!existing.has(field) && t.validation.fieldGroups.length < MAX_FIELD_GROUPS) {
            t.validation.fieldGroups.push({
              id: genId(), field,
              conditions: [{ id: genId(), operator: 'is_not_empty', value: '' }],
              conditionLogic: 'and', scenarioScope: 'all',
            });
            existing.add(field);
          }
        }
      }),
  };
}
