/**
 * Validation slice.
 */

import type {
  EntityId,
  TestDefinition,
  ValidationType,
  ConditionOperator,
  ResultCountOperator,
  FieldCondition,
} from '../../types';
import { genId } from '../../constants/defaults';
import { MAX_FIELD_CONDITIONS } from '../../constants/limits';
import { findTest } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

export function validationSlice(set: SetState) {
  return {
    addFieldCondition: (testId: EntityId, condition?: Partial<FieldCondition>) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t || t.validation.fieldConditions.length >= MAX_FIELD_CONDITIONS) return;
        t.validation.fieldConditions.push({
          id: genId(),
          field: condition?.field ?? '',
          operator: (condition?.operator as ConditionOperator) ?? 'not_empty',
          value: condition?.value ?? '',
          scenarioScope: condition?.scenarioScope ?? 'all',
        });
      }),

    removeFieldCondition: (testId: EntityId, conditionId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        const idx = t.validation.fieldConditions.findIndex((c) => c.id === conditionId);
        if (idx !== -1) t.validation.fieldConditions.splice(idx, 1);
      }),

    updateFieldCondition: (
      testId: EntityId,
      conditionId: EntityId,
      patch: Partial<Pick<FieldCondition, 'field' | 'operator' | 'value' | 'scenarioScope'>>
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const c = t?.validation.fieldConditions.find((x) => x.id === conditionId);
        if (!c) return;
        if (patch.field !== undefined) c.field = patch.field;
        if (patch.operator !== undefined) c.operator = patch.operator;
        if (patch.value !== undefined) c.value = patch.value;
        if (patch.scenarioScope !== undefined) c.scenarioScope = patch.scenarioScope;
      }),

    setValidationType: (testId: EntityId, validationType: ValidationType) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.validationType = validationType;
      }),

    setValidationApproach: (testId: EntityId, approach: 'expected_result' | 'field_conditions') =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.approach = approach;
      }),

    setExpectedResultJson: (testId: EntityId, json: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.expectedResultJson = json;
      }),

    setExpectedResultFileRef: (
      testId: EntityId,
      fileRef: { name: string; size: number } | null
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (t) t.validation.expectedResultFileRef = fileRef;
      }),

    updateResultCount: (
      testId: EntityId,
      patch: Partial<{ enabled: boolean; operator: ResultCountOperator; value: number }>
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
        const existing = new Set(t.validation.fieldConditions.map((fc) => fc.field));
        for (const field of fields) {
          if (!existing.has(field) && t.validation.fieldConditions.length < MAX_FIELD_CONDITIONS) {
            t.validation.fieldConditions.push({
              id: genId(),
              field,
              operator: 'not_empty',
              value: '',
              scenarioScope: 'all',
            });
            existing.add(field);
          }
        }
      }),
  };
}
