/**
 * Unit tests for scheduledTestsSlice — CRUD, optimistic updates, runNow, history.
 */
import { useTestStore } from '../../testStore';
import { scheduledTestsApi } from '../../../../api/scheduledTestsApi';
import type { ScheduledTest, TestRunRecord } from '../../../types';

jest.mock('../../../../api/scheduledTestsApi');
const mockedApi = scheduledTestsApi as jest.Mocked<typeof scheduledTestsApi>;

function makeScheduledTest(overrides: Partial<ScheduledTest> = {}): ScheduledTest {
    return {
        id: 'st-1',
        testId: 'test-1',
        testName: 'Scheduled A',
        app: 'search',
        savedSearchOrigin: null,
        cronSchedule: '0 */6 * * *',
        enabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        lastRunAt: null,
        lastRunStatus: null,
        alertOnFailure: false,
        emailRecipients: [],
        ...overrides,
    };
}

function makeRunRecord(overrides: Partial<TestRunRecord> = {}): TestRunRecord {
    return {
        id: 'run-1',
        scheduledTestId: 'st-1',
        ranAt: '2026-03-15T10:00:00Z',
        status: 'pass',
        durationMs: 1200,
        splSnapshotHash: 'abc123',
        splDriftDetected: false,
        resultSummary: 'All passed',
        scenarioResults: [
            { scenarioId: 's1', scenarioName: 'Scenario 1', passed: true, message: 'OK' },
        ],
        ...overrides,
    };
}

function resetStore() {
    useTestStore.setState({
        scheduledTests: [],
        runHistory: {},
        isLoadingScheduled: false,
        scheduledError: null,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
});

// ─── fetchScheduledTests ────────────────────────────────────────────────────

describe('fetchScheduledTests', () => {
    it('fetches and sets scheduled tests', async () => {
        const tests = [makeScheduledTest({ id: 'a' }), makeScheduledTest({ id: 'b' })];
        mockedApi.getScheduledTests.mockResolvedValue(tests);

        await useTestStore.getState().fetchScheduledTests();

        expect(useTestStore.getState().scheduledTests).toHaveLength(2);
        expect(useTestStore.getState().isLoadingScheduled).toBe(false);
    });

    it('sets isLoadingScheduled during fetch', async () => {
        mockedApi.getScheduledTests.mockResolvedValue([]);
        const promise = useTestStore.getState().fetchScheduledTests();
        expect(useTestStore.getState().isLoadingScheduled).toBe(true);
        await promise;
        expect(useTestStore.getState().isLoadingScheduled).toBe(false);
    });

    it('handles non-array response gracefully', async () => {
        mockedApi.getScheduledTests.mockResolvedValue(null as any);
        await useTestStore.getState().fetchScheduledTests();
        expect(useTestStore.getState().scheduledTests).toEqual([]);
    });

    it('sets scheduledError on failure', async () => {
        mockedApi.getScheduledTests.mockRejectedValue(new Error('Fetch error'));
        await useTestStore.getState().fetchScheduledTests();
        expect(useTestStore.getState().scheduledError).toBe('Fetch error');
        expect(useTestStore.getState().isLoadingScheduled).toBe(false);
    });
});

// ─── createScheduledTest ────────────────────────────────────────────────────

describe('createScheduledTest', () => {
    it('creates and appends a new scheduled test', async () => {
        const created = makeScheduledTest({ id: 'new-st' });
        mockedApi.createScheduledTest.mockResolvedValue(created);

        const payload = {
            testId: 'test-1',
            testName: 'New Test',
            app: 'search',
            savedSearchOrigin: null,
            cronSchedule: '0 * * * *',
            enabled: true,
            alertOnFailure: false,
            emailRecipients: [],
        };
        await useTestStore.getState().createScheduledTest(payload);

        expect(useTestStore.getState().scheduledTests).toHaveLength(1);
        expect(useTestStore.getState().scheduledTests[0].id).toBe('new-st');
        expect(useTestStore.getState().isLoadingScheduled).toBe(false);
    });

    it('sets error on failure', async () => {
        mockedApi.createScheduledTest.mockRejectedValue(new Error('Create fail'));
        await useTestStore.getState().createScheduledTest({
            testId: 't', testName: 'n', app: 'a', savedSearchOrigin: null,
            cronSchedule: '0 * * * *', enabled: true, alertOnFailure: false, emailRecipients: [],
        });
        expect(useTestStore.getState().scheduledError).toBe('Create fail');
    });
});

// ─── updateScheduledTest (optimistic) ───────────────────────────────────────

describe('updateScheduledTest', () => {
    it('applies patch optimistically then confirms with server response', async () => {
        const original = makeScheduledTest({ id: 'opt-1', enabled: true });
        useTestStore.setState({ scheduledTests: [original] });

        const serverResponse = makeScheduledTest({ id: 'opt-1', enabled: false });
        mockedApi.updateScheduledTest.mockResolvedValue(serverResponse);

        const promise = useTestStore.getState().updateScheduledTest('opt-1', { enabled: false });

        // Optimistic: immediately reflects the change
        expect(useTestStore.getState().scheduledTests[0].enabled).toBe(false);

        await promise;

        // Confirmed with server response
        expect(useTestStore.getState().scheduledTests[0].enabled).toBe(false);
    });

    it('rolls back to snapshot on API failure', async () => {
        const original = makeScheduledTest({ id: 'opt-2', enabled: true, cronSchedule: '0 */6 * * *' });
        useTestStore.setState({ scheduledTests: [original] });

        mockedApi.updateScheduledTest.mockRejectedValue(new Error('Update fail'));

        await useTestStore.getState().updateScheduledTest('opt-2', { enabled: false });

        // Should revert to original state
        expect(useTestStore.getState().scheduledTests[0].enabled).toBe(true);
        expect(useTestStore.getState().scheduledError).toBe('Update fail');
    });

    it('updates cron schedule optimistically', async () => {
        const original = makeScheduledTest({ id: 'opt-3', cronSchedule: '0 * * * *' });
        useTestStore.setState({ scheduledTests: [original] });

        const updated = makeScheduledTest({ id: 'opt-3', cronSchedule: '*/30 * * * *' });
        mockedApi.updateScheduledTest.mockResolvedValue(updated);

        await useTestStore.getState().updateScheduledTest('opt-3', { cronSchedule: '*/30 * * * *' });
        expect(useTestStore.getState().scheduledTests[0].cronSchedule).toBe('*/30 * * * *');
    });
});

// ─── deleteScheduledTest ────────────────────────────────────────────────────

describe('deleteScheduledTest', () => {
    it('removes test and its run history', async () => {
        const st = makeScheduledTest({ id: 'del-1' });
        useTestStore.setState({
            scheduledTests: [st],
            runHistory: { 'del-1': [makeRunRecord()] },
        });
        mockedApi.deleteScheduledTest.mockResolvedValue(undefined);

        await useTestStore.getState().deleteScheduledTest('del-1');

        expect(useTestStore.getState().scheduledTests).toHaveLength(0);
        expect(useTestStore.getState().runHistory['del-1']).toBeUndefined();
    });

    it('sets error without removing on failure', async () => {
        const st = makeScheduledTest({ id: 'del-2' });
        useTestStore.setState({ scheduledTests: [st] });
        mockedApi.deleteScheduledTest.mockRejectedValue(new Error('Delete fail'));

        await useTestStore.getState().deleteScheduledTest('del-2');

        expect(useTestStore.getState().scheduledTests).toHaveLength(1);
        expect(useTestStore.getState().scheduledError).toBe('Delete fail');
    });
});

// ─── runNow ─────────────────────────────────────────────────────────────────

describe('runNow', () => {
    it('adds run record to history and updates lastRun fields', async () => {
        const st = makeScheduledTest({ id: 'run-st', lastRunAt: null, lastRunStatus: null });
        useTestStore.setState({ scheduledTests: [st] });

        const record = makeRunRecord({ scheduledTestId: 'run-st', status: 'pass', ranAt: '2026-03-15T12:00:00Z' });
        mockedApi.runScheduledTestNow.mockResolvedValue(record);

        await useTestStore.getState().runNow('run-st');

        const state = useTestStore.getState();
        expect(state.runHistory['run-st']).toHaveLength(1);
        expect(state.runHistory['run-st'][0].status).toBe('pass');
        expect(state.scheduledTests[0].lastRunAt).toBe('2026-03-15T12:00:00Z');
        expect(state.scheduledTests[0].lastRunStatus).toBe('pass');
        expect(state.isLoadingScheduled).toBe(false);
    });

    it('prepends to existing history', async () => {
        const existing = makeRunRecord({ id: 'old-run', scheduledTestId: 'run-st2' });
        useTestStore.setState({
            scheduledTests: [makeScheduledTest({ id: 'run-st2' })],
            runHistory: { 'run-st2': [existing] },
        });

        const newRecord = makeRunRecord({ id: 'new-run', scheduledTestId: 'run-st2', ranAt: '2026-03-15T13:00:00Z' });
        mockedApi.runScheduledTestNow.mockResolvedValue(newRecord);

        await useTestStore.getState().runNow('run-st2');

        expect(useTestStore.getState().runHistory['run-st2']).toHaveLength(2);
        expect(useTestStore.getState().runHistory['run-st2'][0].id).toBe('new-run');
    });

    it('sets error on failure', async () => {
        useTestStore.setState({ scheduledTests: [makeScheduledTest({ id: 'run-st3' })] });
        mockedApi.runScheduledTestNow.mockRejectedValue(new Error('Run failed'));

        await useTestStore.getState().runNow('run-st3');

        expect(useTestStore.getState().scheduledError).toBe('Run failed');
        expect(useTestStore.getState().isLoadingScheduled).toBe(false);
    });
});

// ─── fetchRunHistory ────────────────────────────────────────────────────────

describe('fetchRunHistory', () => {
    it('fetches and stores run history for a test', async () => {
        const records = [makeRunRecord({ id: 'r1' }), makeRunRecord({ id: 'r2' })];
        mockedApi.getRunHistory.mockResolvedValue(records);

        await useTestStore.getState().fetchRunHistory('st-1');

        expect(useTestStore.getState().runHistory['st-1']).toHaveLength(2);
    });

    it('sets error on failure', async () => {
        mockedApi.getRunHistory.mockRejectedValue(new Error('History fail'));
        await useTestStore.getState().fetchRunHistory('st-1');
        expect(useTestStore.getState().scheduledError).toBe('History fail');
    });
});

// ─── clearScheduledError ────────────────────────────────────────────────────

describe('clearScheduledError', () => {
    it('clears the error', () => {
        useTestStore.setState({ scheduledError: 'some error' });
        useTestStore.getState().clearScheduledError();
        expect(useTestStore.getState().scheduledError).toBeNull();
    });
});
