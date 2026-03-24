/**
 * tutorialSeeder — builds a fully populated tutorial test and loads it into the store.
 *
 * Called once when the user clicks the tutorial button. The test has all sections
 * filled so every panel (query, data, validation) is visible from the start.
 */
import { useTestStore } from 'core/store/testStore';
import { genId } from 'core/constants/defaults';
import type { TestDefinition } from 'core/types';

const SAMPLE_SPL =
    'index=main sourcetype=access_combined\n| stats count by status\n| where count > 0';
const SAMPLE_ROW_ID = 'index=main sourcetype=access_combined';

/** Build a fully populated tutorial test and load it as the active test. */
export function loadTutorialTest(): void {
    const store = useTestStore.getState();

    const test = buildTutorialTest();

    store.resetToNewTest();
    // loadFromFile accepts the serialized format with testDefinition array
    store.loadFromFile(
        JSON.stringify({
            version: 2,
            savedAt: new Date().toISOString(),
            activeTestId: test.id,
            testDefinition: [test],
            payload: [],
        }),
    );
}

function buildTutorialTest(): TestDefinition {
    const fieldValueIds = [genId(), genId(), genId()];
    const eventId = genId();
    const inputId = genId();
    const scenarioId = genId();
    const testId = genId();
    const ruleId = genId();
    const conditionId = genId();
    const groupId = genId();

    return {
        id: testId,
        name: 'Tutorial: Web Access Test',
        app: 'search',
        testType: 'standard',
        query: {
            spl: SAMPLE_SPL,
            savedSearchOrigin: null,
            timeRange: { earliest: '-24h@h', latest: 'now', label: 'Last 24 hours' },
        },
        scenarios: [
            {
                id: scenarioId,
                name: 'Success scenario',
                description: 'Verifies that status 200 events produce a positive count.',
                inputs: [
                    {
                        id: inputId,
                        rowIdentifier: SAMPLE_ROW_ID,
                        inputMode: 'fields',
                        jsonContent: '',
                        fileRef: null,
                        queryDataConfig: {
                            spl: '',
                            savedSearchName: null,
                            timeRange: { earliest: '-24h@h', latest: 'now', label: 'Last 24 hours' },
                        },
                        events: [
                            {
                                id: eventId,
                                fieldValues: [
                                    { id: fieldValueIds[0], field: 'status', value: '200' },
                                    { id: fieldValueIds[1], field: 'method', value: 'GET' },
                                    { id: fieldValueIds[2], field: 'uri_path', value: '/api/health' },
                                ],
                            },
                        ],
                        generatorConfig: {
                            enabled: true,
                            eventCount: 50,
                            rules: [
                                {
                                    id: ruleId,
                                    field: 'status',
                                    type: 'pick_list',
                                    config: {
                                        items: [
                                            { id: genId(), value: '200', weight: 70 },
                                            { id: genId(), value: '404', weight: 20 },
                                            { id: genId(), value: '500', weight: 10 },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        ],
        validation: {
            validationType: 'standard',
            fieldLogic: 'and',
            validationScope: 'any_event',
            scopeN: null,
            resultCount: { enabled: true, operator: 'greater_than', value: 0 },
            fieldGroups: [
                {
                    id: groupId,
                    field: 'count',
                    conditionLogic: 'and',
                    scenarioScope: 'all',
                    conditions: [
                        { id: conditionId, operator: 'greater_than', value: '0' },
                    ],
                },
            ],
        },
    };
}
