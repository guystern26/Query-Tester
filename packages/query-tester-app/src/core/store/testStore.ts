/**
 * Single Zustand v4 store with Immer. Spec 9, 15.
 * Combines all slices; only create() call lives here.
 */

import create from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  EntityId,
  TestDefinition,
  TestResponse,
  InputMode,
  ValidationType,
  ValidationScope,
  ResultCountOperator,
  FieldConditionGroup,
  SingleCondition,
  FieldGenerationRule,
  ExtractedDataSource,
  TestType,
} from '../types';
import { createDefaultTest } from '../constants/defaults';
import { testSlice } from './slices/testSlice';
import { scenarioSlice } from './slices/scenarioSlice';
import { inputSlice } from './slices/inputSlice';
import { querySlice } from './slices/querySlice';
import { validationSlice } from './slices/validationSlice';
import { generatorSlice } from './slices/generatorSlice';
import { runSlice } from './slices/runSlice';
import { fileSlice } from './slices/fileSlice';

export type { SavedState } from './slices/fileSlice';

export interface TestStoreState {
  tests: TestDefinition[];
  activeTestId: EntityId | null;
  isRunning: boolean;
  testResponse: TestResponse | null;
  resultsBarExpanded: boolean;

  addTest: () => void;
  deleteTest: (testId: EntityId) => void;
  duplicateTest: (testId: EntityId) => void;
  updateTestName: (testId: EntityId, name: string) => void;
  setActiveTest: (testId: EntityId | null) => void;
  updateTestType: (testId: EntityId, testType: TestType) => void;
  updateApp: (testId: EntityId, app: string) => void;

  addScenario: (testId: EntityId) => void;
  deleteScenario: (testId: EntityId, scenarioId: EntityId) => void;
  updateScenarioName: (testId: EntityId, scenarioId: EntityId, name: string) => void;
  updateScenarioDescription: (testId: EntityId, scenarioId: EntityId, description: string) => void;

  addInput: (testId: EntityId, scenarioId: EntityId) => void;
  deleteInput: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
  setInputMode: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, mode: InputMode) => void;
  updateRowIdentifier: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, rowIdentifier: string) => void;
  updateInputJson: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, jsonContent: string) => void;
  setInputFileRef: (
    testId: EntityId,
    scenarioId: EntityId,
    inputId: EntityId,
    fileRef: { name: string; size: number } | null
  ) => void;

  addEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
  deleteEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventId: EntityId) => void;

  addFieldToAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) => void;
  removeFieldFromAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, fieldIndex: number) => void;
  updateFieldValue: (
    testId: EntityId,
    scenarioId: EntityId,
    inputId: EntityId,
    eventId: EntityId,
    fieldValueId: EntityId,
    patch: { field?: string; value?: string }
  ) => void;
  updateFieldNameInAllEvents: (
    testId: EntityId,
    scenarioId: EntityId,
    inputId: EntityId,
    fieldIndex: number,
    newName: string
  ) => void;

  updateSpl: (testId: EntityId, spl: string) => void;
  loadSavedSearchSpl: (testId: EntityId, spl: string, savedSearchOrigin: string | null) => void;

  addFieldGroup: (testId: EntityId, initial?: Partial<FieldConditionGroup>) => void;
  removeFieldGroup: (testId: EntityId, groupId: EntityId) => void;
  duplicateFieldGroup: (testId: EntityId, groupId: EntityId) => void;
  updateFieldGroupField: (testId: EntityId, groupId: EntityId, field: string) => void;
  updateFieldGroupLogic: (testId: EntityId, groupId: EntityId, logic: 'and' | 'or') => void;
  updateFieldGroupScope: (testId: EntityId, groupId: EntityId, scope: 'all' | EntityId[]) => void;
  addConditionToGroup: (testId: EntityId, groupId: EntityId, initial?: Partial<SingleCondition>) => void;
  removeConditionFromGroup: (testId: EntityId, groupId: EntityId, conditionId: EntityId) => void;
  updateConditionInGroup: (testId: EntityId, groupId: EntityId, conditionId: EntityId, patch: Partial<Pick<SingleCondition, 'operator' | 'value'>>) => void;
  updateFieldLogic: (testId: EntityId, logic: 'and' | 'or') => void;
  updateValidationScope: (testId: EntityId, scope: ValidationScope, scopeN?: number | null) => void;
  replaceAllFieldGroups: (testId: EntityId, groups: FieldConditionGroup[]) => void;
  setValidationType: (testId: EntityId, validationType: ValidationType) => void;
  updateResultCount: (testId: EntityId, patch: Partial<{ enabled: boolean; operator: ResultCountOperator; value: number }>) => void;

  setGeneratorEnabled: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, enabled: boolean) => void;
  updateGeneratorEventCount: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventCount: number) => void;
  addGeneratorRule: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, rule: Omit<FieldGenerationRule, 'id'>) => void;
  deleteGeneratorRule: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, ruleId: EntityId) => void;
  updateGeneratorRule: (
    testId: EntityId,
    scenarioId: EntityId,
    inputId: EntityId,
    ruleId: EntityId,
    patch: Partial<Pick<FieldGenerationRule, 'field' | 'type' | 'config'>>
  ) => void;

  runTest: () => Promise<void>;
  cancelTest: () => void;
  setTestResponse: (response: TestResponse | null) => void;
  clearResults: () => void;
  toggleResultsBar: () => void;
  setResultsBarExpanded: (expanded: boolean) => void;

  saveToFile: () => void;
  loadFromFile: (content: string) => { success: boolean; error?: string };

  setFieldExtraction: (testId: EntityId, sources: ExtractedDataSource[]) => void;
  selectDataSource: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, source: ExtractedDataSource) => void;
  applySuggestedValidationFields: (testId: EntityId, fields: string[]) => void;
}

const initialTest = createDefaultTest();

export const useTestStore = create<TestStoreState>()(
  immer((set, get) => ({
    tests: [initialTest],
    activeTestId: initialTest.id,
    isRunning: false,
    testResponse: null,
    resultsBarExpanded: false,

    ...testSlice(set, get),
    ...scenarioSlice(set),
    ...inputSlice(set),
    ...querySlice(set),
    ...validationSlice(set),
    ...generatorSlice(set),
    ...runSlice(set, get),
    ...fileSlice(set, get),
  }))
);
