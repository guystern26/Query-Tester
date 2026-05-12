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
            const result = await getSavedSearchSpl(app, savedSearchName);
            const store = get() as ReturnType<typeof get> & {
                loadSavedSearchSpl: (id: EntityId, spl: string, origin: string | null) => void;
                setTimeRange: (id: EntityId, tr: { earliest: string; latest: string; label: string }) => void;
            };
            store.loadSavedSearchSpl(testId, result.spl, savedSearchName);
            if (result.earliestTime || result.latestTime) {
                store.setTimeRange(testId, {
                    earliest: result.earliestTime,
                    latest: result.latestTime,
                    label: result.earliestTime + ' to ' + result.latestTime,
                });
            }
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
            const result = await getSavedSearchSpl(app, savedSearchName);
            const store = get() as ReturnType<typeof get> & {
                updateQueryDataSpl: (tId: EntityId, sId: EntityId, iId: EntityId, spl: string) => void;
                updateQueryDataSavedSearch: (tId: EntityId, sId: EntityId, iId: EntityId, name: string | null) => void;
            };
            store.updateQueryDataSpl(testId, scenarioId, inputId, result.spl);
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
            const store = get() as ReturnType<typeof get> & {
                setFieldExtraction: (id: EntityId, sources: ExtractedDataSource[]) => void;
            };

            // Step 1: Immediately populate with regex-detected sources
            var regexSources = _regexExtractSources(spl);
            if (regexSources.length > 0) {
                store.setFieldExtraction(testId, regexSources);
            }

            // Step 2: Race LLM with 10s timeout
            var LLM_TIMEOUT = 10000;
            var timeoutPromise = new Promise<null>(function (resolve) {
                setTimeout(function () { resolve(null); }, LLM_TIMEOUT);
            });

            try {
                var result = await Promise.race([
                    extractDataSources(spl),
                    timeoutPromise,
                ]);
                if (result !== null) {
                    // LLM responded in time — replace regex results
                    store.setFieldExtraction(testId, result);
                    return result;
                }
                // LLM timed out — keep regex results
                return regexSources;
            } catch {
                // LLM failed — keep regex results
                return regexSources;
            }
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

            // Set loading flag
            const setLoading = (v: boolean) => _set((draft) => {
                const t = draft.tests.find((x) => x.id === testId);
                const s = t?.scenarios.find((x) => x.id === scenarioId);
                const inp = s?.inputs.find((x) => x.id === inputId);
                if (inp) inp.sampleValuesLoading = v;
            });
            setLoading(true);

            try {
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
                            break;
                        }
                    } catch { /* try next range */ }
                }

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
            } finally {
                setLoading(false);
            }
        },
    };
}

// ── Mock data for dev mode (no LLM / no Splunk) ────────────────────────────

/** Regex-based data source extraction — runs instantly, no LLM needed.
 * Finds all index=, inputlookup, lookup, and rest clauses in the SPL. */
function _regexExtractSources(spl: string): ExtractedDataSource[] {
    var sources: ExtractedDataSource[] = [];
    var seen = new Set<string>();

    // index= with optional sourcetype/source/host
    var idxRe = /\bindex\s*=\s*["']?[\w*\-\.]+["']?(?:\s+(?:sourcetype|source|host)\s*=\s*["']?[\w*\-\.]+["']?)*/gi;
    var m: RegExpExecArray | null;
    while ((m = idxRe.exec(spl)) !== null) {
        var ri = m[0].trim();
        if (!seen.has(ri.toLowerCase())) {
            seen.add(ri.toLowerCase());
            sources.push({ rowIdentifier: ri, fields: _extractFields(spl) });
        }
    }

    // inputlookup
    var ilRe = /(?:\|\s*)?inputlookup\s+[\w\-\.]+(?:\.csv)?/gi;
    while ((m = ilRe.exec(spl)) !== null) {
        var ri2 = m[0].replace(/^\|\s*/, '').trim();
        if (!seen.has(ri2.toLowerCase())) {
            seen.add(ri2.toLowerCase());
            sources.push({ rowIdentifier: ri2, fields: [] });
        }
    }

    // lookup (piped)
    var lkRe = /\|\s*lookup\s+[\w\-\.]+/gi;
    while ((m = lkRe.exec(spl)) !== null) {
        var ri3 = m[0].replace(/^\|\s*/, '').trim();
        if (!seen.has(ri3.toLowerCase())) {
            seen.add(ri3.toLowerCase());
            sources.push({ rowIdentifier: ri3, fields: [] });
        }
    }

    // rest
    var restRe = /(?:\|\s*)?rest\s+[^|]+?(?=\s*\||$)/gi;
    while ((m = restRe.exec(spl)) !== null) {
        var ri4 = m[0].replace(/^\|\s*/, '').trim();
        if (!seen.has(ri4.toLowerCase())) {
            seen.add(ri4.toLowerCase());
            sources.push({ rowIdentifier: ri4, fields: [] });
        }
    }

    return sources;
}

/** Extract field names from stats/eval/by/as clauses. */
/** Extract field names from common SPL commands. */
function _extractFields(spl: string): string[] {
    var fields: string[] = [];
    var m: RegExpExecArray | null;

    function addParts(text: string) {
        var parts = text.split(/[,\s]+/);
        for (var i = 0; i < parts.length; i++) {
            var clean = parts[i].replace(/^[-+]/, '').replace(/[()]/g, '');
            if (clean && clean.indexOf('=') === -1 && clean !== '*' && fields.indexOf(clean) === -1) {
                fields.push(clean);
            }
        }
    }

    // stats/chart ... by field1, field2
    var byMatch = /\bby\s+([\w,\s]+)/gi;
    while ((m = byMatch.exec(spl)) !== null) { addParts(m[1]); }

    // ... as fieldName
    var asMatch = /\bas\s+(\w+)/gi;
    while ((m = asMatch.exec(spl)) !== null) {
        if (fields.indexOf(m[1]) === -1) fields.push(m[1]);
    }

    // | table field1, field2  /  | fields field1, field2
    var tableFieldsMatch = /\|\s*(?:table|fields)\s+([\w,\s\-*]+?)(?=\s*\||$)/gi;
    while ((m = tableFieldsMatch.exec(spl)) !== null) { addParts(m[1]); }

    // | sort -field1, +field2
    var sortMatch = /\|\s*sort\s+([\w,\s\-+]+?)(?=\s*\||$)/gi;
    while ((m = sortMatch.exec(spl)) !== null) { addParts(m[1]); }

    // | eval field = ...
    var evalMatch = /\|\s*eval\s+(\w+)\s*=/gi;
    while ((m = evalMatch.exec(spl)) !== null) {
        if (fields.indexOf(m[1]) === -1) fields.push(m[1]);
    }

    // | rename old AS new
    var renameMatch = /\|\s*rename\s+[\w.]+\s+[Aa][Ss]\s+(\w+)/gi;
    while ((m = renameMatch.exec(spl)) !== null) {
        if (fields.indexOf(m[1]) === -1) fields.push(m[1]);
    }

    // | lookup file.csv field AS output
    var lookupAsMatch = /\|\s*lookup\s+[\w\-\.]+\s+[\w]+(?:\s+[Aa][Ss]\s+(\w+))?/gi;
    while ((m = lookupAsMatch.exec(spl)) !== null) {
        if (m[1] && fields.indexOf(m[1]) === -1) fields.push(m[1]);
    }

    return fields;
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
