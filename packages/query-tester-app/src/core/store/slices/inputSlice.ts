/** Input + event + field slice. */
import type { EntityId, TestDefinition, TimeRange, InputMode, ExtractedDataSource } from '../../types';
import { genId, createDefaultInput } from '../../constants/defaults';
import { MAX_INPUTS_PER_SCENARIO, MAX_EVENTS_PER_INPUT, MAX_FIELDS_PER_EVENT } from '../../constants/limits';
import { findTest, findScenario, findInput } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

export function inputSlice(set: SetState) {
  return {
    addInput: (testId: EntityId, scenarioId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        if (!s || s.inputs.length >= MAX_INPUTS_PER_SCENARIO) return;
        s.inputs.push(createDefaultInput());
      }),

    deleteInput: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        if (!s) return;
        const idx = s.inputs.findIndex((i) => i.id === inputId);
        if (idx !== -1) s.inputs.splice(idx, 1);
      }),

    setInputMode: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, mode: InputMode) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input && input.inputMode !== mode) {
          input.inputMode = mode;
          // Reset generator when switching modes — fields and JSON are independent
          input.generatorConfig = { enabled: false, rules: [], eventCount: input.generatorConfig.eventCount };
        }
      }),

    updateRowIdentifier: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, rowIdentifier: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.rowIdentifier = rowIdentifier;
      }),

    updateInputJson: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, jsonContent: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.jsonContent = jsonContent;
      }),

    setInputFileRef: (
      testId: EntityId,
      scenarioId: EntityId,
      inputId: EntityId,
      fileRef: { name: string; size: number } | null
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.fileRef = fileRef;
      }),

    addEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input || input.events.length >= MAX_EVENTS_PER_INPUT) return;
        const lastEvent = input.events[input.events.length - 1];
        const newFieldValues = lastEvent
          ? lastEvent.fieldValues.map((fv) => ({ id: genId(), field: fv.field, value: '' }))
          : [{ id: genId(), field: '', value: '' }];
        input.events.push({ id: genId(), fieldValues: newFieldValues });
      }),

    deleteEvent: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input || input.events.length <= 1) return;
        const idx = input.events.findIndex((e) => e.id === eventId);
        if (idx !== -1) input.events.splice(idx, 1);
      }),

    addFieldToAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input) return;
        const maxFields = Math.max(0, ...input.events.map((e) => e.fieldValues.length));
        if (maxFields >= MAX_FIELDS_PER_EVENT) return;
        for (const evt of input.events) {
          evt.fieldValues.push({ id: genId(), field: '', value: '' });
        }
      }),

    removeFieldFromAllEvents: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, fieldIndex: number) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input) return;
        for (const evt of input.events) {
          if (fieldIndex >= 0 && fieldIndex < evt.fieldValues.length) {
            evt.fieldValues.splice(fieldIndex, 1);
          }
        }
      }),

    updateFieldValue: (
      testId: EntityId,
      scenarioId: EntityId,
      inputId: EntityId,
      eventId: EntityId,
      fieldValueId: EntityId,
      patch: { field?: string; value?: string }
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        const evt = input?.events.find((e) => e.id === eventId);
        const fv = evt?.fieldValues.find((f) => f.id === fieldValueId);
        if (fv) {
          if (patch.field !== undefined) fv.field = patch.field;
          if (patch.value !== undefined) fv.value = patch.value;
        }
      }),

    updateFieldNameInAllEvents: (
      testId: EntityId,
      scenarioId: EntityId,
      inputId: EntityId,
      fieldIndex: number,
      newName: string
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input) return;
        for (const evt of input.events) {
          const fv = evt.fieldValues[fieldIndex];
          if (fv) fv.field = newName;
        }
      }),

    selectDataSource: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, source: ExtractedDataSource) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input) return;
        input.rowIdentifier = source.rowIdentifier;
        input.inputMode = 'fields';
        // Don't auto-populate fields — user picks from dropdown
        if (input.events.length === 0) {
          input.events = [{ id: genId(), fieldValues: [] }];
        }
      }),

    addInputFromSource: (testId: EntityId, scenarioId: EntityId, rowIdentifier: string, fields: string[]) =>
      set((draft) => {
        const scenario = findScenario(findTest(draft.tests, testId), scenarioId);
        if (!scenario) return;

        // Prevent duplicate row identifiers in the same scenario
        const riLower = rowIdentifier.trim().toLowerCase();
        const alreadyExists = scenario.inputs.some(
          (inp) => inp.rowIdentifier.trim().toLowerCase() === riLower
        );
        if (alreadyExists) return;

        // Find an existing empty input to fill instead of creating a new one
        const emptyInput = scenario.inputs.find((inp) => {
            if (inp.rowIdentifier.trim() !== '') return false;
            if (inp.events.length > 1) return false;
            if (inp.events.length === 1) {
                const hasData = inp.events[0].fieldValues.some(
                    (fv) => fv.field.trim() !== '' || fv.value.trim() !== ''
                );
                if (hasData) return false;
            }
            return true;
        });

        if (emptyInput) {
            emptyInput.rowIdentifier = rowIdentifier;
            emptyInput.inputMode = 'fields';
            if (fields.length > 0) {
                if (emptyInput.events.length === 0) {
                    emptyInput.events = [{ id: genId(), fieldValues: [] }];
                }
                emptyInput.events[0].fieldValues = fields.map((f) => ({
                    id: genId(), field: f, value: '',
                }));
            }
            return;
        }

        if (scenario.inputs.length >= MAX_INPUTS_PER_SCENARIO) return;
        const newInput = createDefaultInput();
        newInput.rowIdentifier = rowIdentifier;
        newInput.inputMode = 'fields';
        // Pre-populate first event with field names from extraction
        if (fields.length > 0 && newInput.events.length > 0) {
            newInput.events[0].fieldValues = fields.map((f) => ({
                id: genId(), field: f, value: '',
            }));
        }
        scenario.inputs.push(newInput);
      }),

    applyFieldSampleValues: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, sampleRow: Record<string, string>) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input || input.events.length === 0) return;
        // Cache sample values for later field picks
        input.sampleValues = { ...(input.sampleValues || {}), ...sampleRow };
        for (const fv of input.events[0].fieldValues) {
          const val = sampleRow[fv.field];
          if (val !== undefined && val !== null && fv.value === '') {
            fv.value = String(val);
          }
        }
      }),

    updateQueryDataSpl: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, spl: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.queryDataConfig.spl = spl;
      }),

    updateQueryDataTimeRange: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, timeRange: TimeRange) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.queryDataConfig.timeRange = timeRange;
      }),

    updateQueryDataSavedSearch: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, name: string | null) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.queryDataConfig.savedSearchName = name;
      }),
  };
}
