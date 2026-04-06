/**
 * Generator slice.
 */

import type { EntityId, TestDefinition, FieldGenerationRule } from '../../types';
import { genId } from '../../constants/defaults';
import { MAX_GENERATOR_RULES } from '../../constants/limits';
import { findTest, findScenario, findInput } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

export function generatorSlice(set: SetState) {
  return {
    setGeneratorEnabled: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, enabled: boolean) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.generatorConfig.enabled = enabled;
      }),

    updateGeneratorEventCount: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, eventCount: number) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (input) input.generatorConfig.eventCount = eventCount;
      }),

    addGeneratorRule: (
      testId: EntityId,
      scenarioId: EntityId,
      inputId: EntityId,
      rule: Omit<FieldGenerationRule, 'id'>
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input || input.generatorConfig.rules.length >= MAX_GENERATOR_RULES) return;
        input.generatorConfig.rules.push({ ...rule, id: genId() });
      }),

    deleteGeneratorRule: (testId: EntityId, scenarioId: EntityId, inputId: EntityId, ruleId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        if (!input) return;
        const idx = input.generatorConfig.rules.findIndex((r) => r.id === ruleId);
        if (idx !== -1) input.generatorConfig.rules.splice(idx, 1);
      }),

    updateGeneratorRule: (
      testId: EntityId,
      scenarioId: EntityId,
      inputId: EntityId,
      ruleId: EntityId,
      patch: Partial<Pick<FieldGenerationRule, 'field' | 'type' | 'config'>>
    ) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        const input = s && findInput(s, inputId);
        const rule = input?.generatorConfig.rules.find((r) => r.id === ruleId);
        if (!rule) return;
        if (patch.field !== undefined) rule.field = patch.field;
        if (patch.type !== undefined) rule.type = patch.type;
        if (patch.config !== undefined) rule.config = patch.config;
      }),
  };
}
