/**
 * Maximum limits for entities. Spec 19.6.
 * At limit: corresponding "Add" / "New" control is disabled.
 */

export const MAX_TESTS_PER_SESSION = 20;
export const MAX_SCENARIOS_PER_TEST = 10;
export const MAX_INPUTS_PER_SCENARIO = 10;
export const MAX_EVENTS_PER_INPUT = 50;
export const MAX_FIELDS_PER_EVENT = 30;
export const MAX_FIELD_GROUPS = 20;
export const MAX_CONDITIONS_PER_GROUP = 10;
export const MAX_GENERATOR_RULES = 30;
export const MAX_GENERATOR_EVENT_COUNT = 10_000;
