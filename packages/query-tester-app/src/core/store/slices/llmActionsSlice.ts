/**
 * LLM actions slice: async store actions for AI-powered features.
 * Wraps API calls so components never import from api/ directly.
 */

import type { EntityId, ExtractedDataSource, TestDefinition } from '../../types';
import { getSavedSearchSpl } from '../../../api/splunkApi';
import { extractDataSources, extractValidationFields } from '../../../api/llmApi';
import { findTest, findScenario } from './helpers';

type SetState = (recipe: (draft: { tests: TestDefinition[] }) => void) => void;
type GetState = () => { tests: TestDefinition[] };

export function llmActionsSlice(_set: SetState, get: GetState) {
    return {
        /**
         * Fetch SPL from a saved search and load it into the test's query.
         * Called from QuerySection when a saved search is selected.
         */
        fetchSavedSearchSpl: async (
            testId: EntityId,
            app: string,
            savedSearchName: string,
        ): Promise<void> => {
            const content = await getSavedSearchSpl(app, savedSearchName);
            const store = get() as ReturnType<typeof get> & {
                loadSavedSearchSpl: (id: EntityId, spl: string, origin: string | null) => void;
            };
            store.loadSavedSearchSpl(testId, content, savedSearchName);
        },

        /**
         * Fetch SPL from a saved search and load it into a query-data input.
         * Called from QueryDataView when a saved search is selected.
         */
        fetchQueryDataSavedSearchSpl: async (
            testId: EntityId,
            scenarioId: EntityId,
            inputId: EntityId,
            app: string,
            savedSearchName: string,
        ): Promise<void> => {
            const content = await getSavedSearchSpl(app, savedSearchName);
            const store = get() as ReturnType<typeof get> & {
                updateQueryDataSpl: (tId: EntityId, sId: EntityId, iId: EntityId, spl: string) => void;
                updateQueryDataSavedSearch: (tId: EntityId, sId: EntityId, iId: EntityId, name: string | null) => void;
            };
            store.updateQueryDataSpl(testId, scenarioId, inputId, content);
            store.updateQueryDataSavedSearch(testId, scenarioId, inputId, savedSearchName);
        },

        /**
         * Extract data sources from SPL via LLM, update store, and auto-populate scenario inputs.
         * Returns the extracted sources for the component to use for phase management.
         */
        fetchExtractDataSources: async (
            testId: EntityId,
            scenarioId: EntityId,
            spl: string,
        ): Promise<ExtractedDataSource[]> => {
            const sources = await extractDataSources(spl);

            const store = get() as ReturnType<typeof get> & {
                setFieldExtraction: (id: EntityId, sources: ExtractedDataSource[]) => void;
                selectDataSource: (
                    tId: EntityId, sId: EntityId, iId: EntityId, src: ExtractedDataSource,
                ) => void;
            };
            store.setFieldExtraction(testId, sources);

            // Auto-populate this scenario's existing inputs
            const test = get().tests.find((t) => t.id === testId);
            const scenario = test && findScenario(test, scenarioId);
            if (scenario && sources.length > 0) {
                const inputs = scenario.inputs;
                for (let i = 0; i < Math.min(sources.length, inputs.length); i++) {
                    store.selectDataSource(testId, scenarioId, inputs[i].id, sources[i]);
                }
            }

            return sources;
        },

        /**
         * Suggest validation fields from SPL via LLM and apply them.
         * Returns info about what was added for the component to display.
         */
        fetchSuggestValidationFields: async (
            testId: EntityId,
            spl: string,
        ): Promise<{ fields: string[]; newCount: number }> => {
            const fields = await extractValidationFields(spl);

            const test = get().tests.find((t) => t.id === testId);
            const existingFields = new Set(
                test?.validation.fieldGroups.map((g) => g.field) ?? [],
            );
            const newFields = fields.filter((f) => !existingFields.has(f));

            const store = get() as ReturnType<typeof get> & {
                applySuggestedValidationFields: (id: EntityId, flds: string[]) => void;
            };
            store.applySuggestedValidationFields(testId, fields);

            return { fields, newCount: newFields.length };
        },
    };
}
