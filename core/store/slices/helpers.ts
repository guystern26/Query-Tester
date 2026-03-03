/**
 * Shared helpers for store slices.
 */

import type { EntityId, TestDefinition } from '../../types';
import { genId } from '../../constants/defaults';

export function findTest(draft: TestDefinition[], testId: EntityId): TestDefinition | undefined {
  return draft.find((t) => t.id === testId);
}

export function findScenario(test: TestDefinition, scenarioId: EntityId) {
  return test.scenarios.find((s) => s.id === scenarioId);
}

export function findInput(
  scenario: { inputs: TestDefinition['scenarios'][0]['inputs'] },
  inputId: EntityId
) {
  return scenario.inputs.find((i) => i.id === inputId);
}

export function deepCloneTestWithNewIds(test: TestDefinition): TestDefinition {
  const idMap = new Map<string, string>();
  const newId = (old: string) => {
    if (!idMap.has(old)) idMap.set(old, genId());
    return idMap.get(old)!;
  };
  return {
    ...test,
    id: genId(),
    name: `${test.name} (Copy)`,
    scenarios: test.scenarios.map((s) => ({
      ...s,
      id: newId(s.id),
      inputs: s.inputs.map((i) => ({
        ...i,
        id: newId(i.id),
        events: i.events.map((e) => ({
          ...e,
          id: newId(e.id),
          fieldValues: e.fieldValues.map((fv) => ({ ...fv, id: newId(fv.id) })),
        })),
        generatorConfig: {
          ...i.generatorConfig,
          rules: i.generatorConfig.rules.map((r) => ({ ...r, id: newId(r.id) })),
        },
      })),
    })),
    query: { ...test.query },
    validation: {
      ...test.validation,
      fieldConditions: test.validation.fieldConditions.map((fc) => ({ ...fc, id: newId(fc.id) })),
    },
  };
}
