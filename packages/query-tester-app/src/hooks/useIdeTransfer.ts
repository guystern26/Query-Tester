/**
 * useIdeTransfer — Receives query transfers from IDE via localStorage.
 * Only active when mode === 'builder'. Reads the transfer key, builds a
 * full TestDefinition, and loads it via loadFromFile (same as import/tutorial).
 */
import { useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { genId } from 'core/constants/defaults';
import type { TestDefinition } from 'core/types';

const TRANSFER_KEY = 'qt_ide_transfer';
const STALE_MS = 30000;

interface TransferPayload {
    spl?: string;
    app?: string;
    name?: string;
    action?: string;
    timestamp?: number;
    timeRange?: { earliest: string; latest: string; label?: string };
}

function buildTestFromTransfer(t: TransferPayload): TestDefinition {
    const testId = genId();
    const scenarioId = genId();
    const inputId = genId();
    return {
        id: testId,
        name: t.name || 'IDE Query',
        app: t.app || 'search',
        testType: 'query_only',
        query: {
            spl: t.spl || '',
            savedSearchOrigin: null,
            timeRange: t.timeRange
                ? { earliest: t.timeRange.earliest, latest: t.timeRange.latest, label: t.timeRange.label || '' }
                : { earliest: '-24h@h', latest: 'now', label: 'Last 24 hours' },
        },
        scenarios: [{
            id: scenarioId,
            name: 'Default scenario',
            description: '',
            inputs: [{
                id: inputId,
                rowIdentifier: '',
                inputMode: 'no_events',
                jsonContent: '',
                fileRef: null,
                queryDataConfig: { spl: '', savedSearchName: null, timeRange: { earliest: '-24h@h', latest: 'now', label: '' } },
                events: [],
                generatorConfig: { enabled: false, eventCount: 0, rules: [] },
            }],
        }],
        validation: {
            validationType: 'standard',
            fieldLogic: 'and',
            validationScope: 'any_event',
            scopeN: null,
            resultCount: { enabled: false, operator: 'greater_than', value: 0 },
            fieldGroups: [],
        },
    };
}

export function useIdeTransfer(mode: 'builder' | 'ide'): void {
    useEffect(() => {
        if (mode !== 'builder') return;
        const raw = localStorage.getItem(TRANSFER_KEY);
        if (!raw) return;
        localStorage.removeItem(TRANSFER_KEY);
        try {
            const t: TransferPayload = JSON.parse(raw);
            if (!t.timestamp || Date.now() - t.timestamp > STALE_MS) return;
            if (!t.spl) return;

            const store = useTestStore.getState();
            const test = buildTestFromTransfer(t);
            store.resetToNewTest();
            store.loadFromFile(JSON.stringify({
                version: 2,
                savedAt: new Date().toISOString(),
                activeTestId: test.id,
                testDefinition: [test],
                payload: [],
            }));
        } catch { /* ignore malformed transfer */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
