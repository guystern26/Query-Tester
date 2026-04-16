/**
 * LLM actions slice: async store actions for AI-powered features.
 * Wraps API calls so components never import from api/ directly.
 */

import type { EntityId, ExtractedDataSource, TestDefinition, TimeRange } from '../../types';
import { getSavedSearchSpl } from '../../../api/splunkApi';
import { extractDataSources, extractValidationFields, callLLM } from '../../../api/llmApi';
import { runIdeQuery } from '../../../api/ideApi';
import { findTest, findScenario, findInput } from './helpers';

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
            let sources: ExtractedDataSource[];
            try {
                sources = await extractDataSources(spl);
            } catch {
                // Fallback mock data for dev mode (no LLM configured)
                sources = _mockExtractedSources(spl);
            }
            const store = get() as ReturnType<typeof get> & {
                setFieldExtraction: (id: EntityId, sources: ExtractedDataSource[]) => void;
            };
            store.setFieldExtraction(testId, sources);
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
            let fields: string[];
            try { fields = await extractValidationFields(spl); } catch { fields = _mockValidationFields(spl); }

            const test = get().tests.find((t) => t.id === testId);
            const existingFields = new Set(
                test?.validation.fieldGroups.map((g) => g.field) ?? [],
            );
            const newFields = fields.filter((f) => !existingFields.has(f));

            // Store suggested fields for the dropdown — don't auto-create groups
            const store = get() as ReturnType<typeof get> & {
                setSuggestedValidationFields: (id: EntityId, flds: string[]) => void;
            };
            store.setSuggestedValidationFields(testId, fields);

            return { fields, newCount: newFields.length };
        },

        /**
         * Fetch real sample values for extracted fields by running the base query.
         * Escalates time range if no results. Falls back to LLM-suggested values.
         */
        fetchSampleValues: async (
            testId: EntityId, scenarioId: EntityId, inputId: EntityId,
            rowIdentifier: string, fields: string[], app: string,
            timeRange?: TimeRange,
        ): Promise<void> => {
            const spl = rowIdentifier + ' | head 1';
            const ranges: Array<{ earliest: string; latest: string }> = [];
            if (timeRange) ranges.push(timeRange);
            ranges.push({ earliest: '-24h', latest: 'now' });
            ranges.push({ earliest: '-7d', latest: 'now' });
            ranges.push({ earliest: '-30d', latest: 'now' });

            const store = get() as ReturnType<typeof get> & {
                applyFieldSampleValues: (t: EntityId, s: EntityId, i: EntityId, row: Record<string, string>) => void;
            };

            // Step 1: Try to get real data from Splunk
            const matched: Record<string, string> = {};
            for (const tr of ranges) {
                try {
                    const resp = await runIdeQuery(app, spl, tr);
                    if (resp.resultRows && resp.resultRows.length > 0) {
                        const row = resp.resultRows[0];
                        for (const f of fields) {
                            if (row[f] !== undefined && row[f] !== '') matched[f] = String(row[f]);
                        }
                        break; // Got data — stop trying wider ranges
                    }
                } catch { /* try next range */ }
            }

            // Apply whatever we found from Splunk
            if (Object.keys(matched).length > 0) {
                store.applyFieldSampleValues(testId, scenarioId, inputId, matched);
            }

            // Step 2: For fields still empty, ask LLM for suggestions
            const missing = fields.filter((f) => !matched[f]);
            if (missing.length > 0) {
                try {
                    const raw = await callLLM(
                        'Given these Splunk field names, suggest one realistic example value for each. Return ONLY a JSON object mapping field name to example value. No explanation.',
                        'Fields: ' + missing.join(', ') + '\nQuery context: ' + rowIdentifier,
                    );
                    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleaned) as Record<string, string>;
                    store.applyFieldSampleValues(testId, scenarioId, inputId, parsed);
                } catch { /* leave empty */ }
            }
        },
    };
}

// ── Mock data for dev mode (no LLM / no Splunk) ────────────────────────────

function _mockExtractedSources(spl: string): ExtractedDataSource[] {
    // Parse index=X sourcetype=Y from the SPL to build a plausible source
    const idxMatch = /index\s*=\s*(\S+)/.exec(spl);
    const stMatch = /sourcetype\s*=\s*(\S+)/.exec(spl);
    const ri = (idxMatch ? 'index=' + idxMatch[1] : 'index=main') + (stMatch ? ' sourcetype=' + stMatch[1] : '');
    // Extract field names from stats/eval/by clauses
    const fields: string[] = [];
    const byMatch = /\bby\s+([\w,\s]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = byMatch.exec(spl)) !== null) { for (const f of m[1].split(/[,\s]+/)) { if (f && !fields.includes(f)) fields.push(f); } }
    const asMatch = /\bas\s+(\w+)/gi;
    while ((m = asMatch.exec(spl)) !== null) { if (!fields.includes(m[1])) fields.push(m[1]); }
    if (fields.length === 0) fields.push('_time', 'host', 'source', 'sourcetype');
    return [{ rowIdentifier: ri, fields }];
}

function _mockValidationFields(spl: string): string[] {
    const fields: string[] = [];
    const byMatch = /\bby\s+([\w,\s]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = byMatch.exec(spl)) !== null) { for (const f of m[1].split(/[,\s]+/)) { if (f && !fields.includes(f)) fields.push(f); } }
    const asMatch = /\bas\s+(\w+)/gi;
    while ((m = asMatch.exec(spl)) !== null) { if (!fields.includes(m[1])) fields.push(m[1]); }
    if (fields.length === 0) fields.push('count', 'status', 'host');
    return fields;
}
