/**
 * Scenario slice: add, delete, updateName, updateDescription.
 */

import type { EntityId, TestDefinition } from '../../types';
import { createDefaultScenario } from '../../constants/defaults';
import { MAX_SCENARIOS_PER_TEST } from '../../constants/limits';
import { findTest, findScenario } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;

export function scenarioSlice(set: SetState) {
  return {
    addScenario: (testId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t || t.scenarios.length >= MAX_SCENARIOS_PER_TEST) return;
        t.scenarios.push(createDefaultScenario());
      }),

    deleteScenario: (testId: EntityId, scenarioId: EntityId) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        if (!t) return;
        const idx = t.scenarios.findIndex((s) => s.id === scenarioId);
        if (idx !== -1) t.scenarios.splice(idx, 1);
      }),

    updateScenarioName: (testId: EntityId, scenarioId: EntityId, name: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        if (s) s.name = name;
      }),

    updateScenarioDescription: (testId: EntityId, scenarioId: EntityId, description: string) =>
      set((draft) => {
        const t = findTest(draft.tests, testId);
        const s = t && findScenario(t, scenarioId);
        if (s) s.description = description;
      }),
  };
}
