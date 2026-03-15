/**
 * Unit tests for testLibrarySlice — fetch, save, update, load, delete.
 */
import { useTestStore } from '../../testStore';
import { savedTestsApi } from '../../../../api/savedTestsApi';
import type { SavedTestFull, TestDefinition } from '../../../types';
import { createDefaultTest } from '../../../constants/defaults';

jest.mock('../../../../api/savedTestsApi');
const mockedApi = savedTestsApi as jest.Mocked<typeof savedTestsApi>;

function makeSavedTest(overrides: Partial<SavedTestFull> = {}): SavedTestFull {
    const def = createDefaultTest();
    def.name = overrides.name || 'Test A';
    return {
        id: 'saved-1',
        name: 'Test A',
        app: 'search',
        testType: 'standard',
        validationType: 'standard',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        createdBy: 'admin',
        scenarioCount: 1,
        description: 'desc',
        definition: def,
        ...overrides,
    };
}

function resetStore() {
    useTestStore.setState({
        savedTests: [],
        isLoadingLibrary: false,
        isSaving: false,
        libraryError: null,
        savedTestId: null,
        hasUnsavedChanges: false,
        tests: [createDefaultTest()],
        activeTestId: null,
        testResponse: null,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
});

// ─── fetchSavedTests ────────────────────────────────────────────────────────

describe('fetchSavedTests', () => {
    it('sets isLoadingLibrary while fetching', async () => {
        mockedApi.listTests.mockResolvedValue([]);
        const promise = useTestStore.getState().fetchSavedTests();
        expect(useTestStore.getState().isLoadingLibrary).toBe(true);
        await promise;
        expect(useTestStore.getState().isLoadingLibrary).toBe(false);
    });

    it('populates savedTests on success', async () => {
        const tests = [makeSavedTest({ id: 'a' }), makeSavedTest({ id: 'b' })];
        mockedApi.listTests.mockResolvedValue(tests);
        await useTestStore.getState().fetchSavedTests();
        expect(useTestStore.getState().savedTests).toHaveLength(2);
        expect(useTestStore.getState().savedTests[0].id).toBe('a');
    });

    it('sets libraryError on API failure', async () => {
        mockedApi.listTests.mockRejectedValue(new Error('Network error'));
        await useTestStore.getState().fetchSavedTests();
        expect(useTestStore.getState().libraryError).toBe('Network error');
        expect(useTestStore.getState().isLoadingLibrary).toBe(false);
    });

    it('clears previous error before fetching', async () => {
        useTestStore.setState({ libraryError: 'old error' });
        mockedApi.listTests.mockResolvedValue([]);
        await useTestStore.getState().fetchSavedTests();
        expect(useTestStore.getState().libraryError).toBeNull();
    });
});

// ─── saveCurrentTest ────────────────────────────────────────────────────────

describe('saveCurrentTest', () => {
    it('saves the active test and adds it to savedTests', async () => {
        const activeTest = createDefaultTest();
        activeTest.name = 'My Test';
        useTestStore.setState({ tests: [activeTest], activeTestId: activeTest.id });

        const saved = makeSavedTest({ id: 'new-saved', name: 'My Test' });
        mockedApi.saveTest.mockResolvedValue(saved);

        await useTestStore.getState().saveCurrentTest('My Test', 'A description');

        expect(mockedApi.saveTest).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'My Test', description: 'A description' })
        );
        expect(useTestStore.getState().savedTests[0].id).toBe('new-saved');
        expect(useTestStore.getState().savedTestId).toBe('new-saved');
        expect(useTestStore.getState().hasUnsavedChanges).toBe(false);
        expect(useTestStore.getState().isSaving).toBe(false);
    });

    it('sets isSaving during save', async () => {
        const test = createDefaultTest();
        useTestStore.setState({ tests: [test], activeTestId: test.id });
        mockedApi.saveTest.mockResolvedValue(makeSavedTest());

        const promise = useTestStore.getState().saveCurrentTest('n', 'd');
        expect(useTestStore.getState().isSaving).toBe(true);
        await promise;
        expect(useTestStore.getState().isSaving).toBe(false);
    });

    it('errors when no active test', async () => {
        useTestStore.setState({ tests: [], activeTestId: null });
        await useTestStore.getState().saveCurrentTest('n', 'd');
        expect(useTestStore.getState().libraryError).toBe('No active test to save.');
        expect(mockedApi.saveTest).not.toHaveBeenCalled();
    });

    it('sets libraryError on API failure', async () => {
        const test = createDefaultTest();
        useTestStore.setState({ tests: [test], activeTestId: test.id });
        mockedApi.saveTest.mockRejectedValue(new Error('Save failed'));

        await useTestStore.getState().saveCurrentTest('n', 'd');
        expect(useTestStore.getState().libraryError).toBe('Save failed');
        expect(useTestStore.getState().isSaving).toBe(false);
    });
});

// ─── updateSavedTest ────────────────────────────────────────────────────────

describe('updateSavedTest', () => {
    it('updates an existing test in the list', async () => {
        const test = createDefaultTest();
        const existing = makeSavedTest({ id: 'u1', name: 'Old Name' });
        useTestStore.setState({
            tests: [test],
            activeTestId: test.id,
            savedTests: [existing],
        });

        const updated = makeSavedTest({ id: 'u1', name: 'New Name' });
        mockedApi.updateTest.mockResolvedValue(updated);

        await useTestStore.getState().updateSavedTest('u1', 'New Name', 'Updated desc');

        expect(useTestStore.getState().savedTests[0].name).toBe('New Name');
        expect(useTestStore.getState().hasUnsavedChanges).toBe(false);
    });

    it('falls back to active test name when name is empty', async () => {
        const test = createDefaultTest();
        test.name = 'Fallback Name';
        useTestStore.setState({
            tests: [test],
            activeTestId: test.id,
            savedTests: [makeSavedTest({ id: 'u2' })],
        });
        mockedApi.updateTest.mockResolvedValue(makeSavedTest({ id: 'u2', name: 'Fallback Name' }));

        await useTestStore.getState().updateSavedTest('u2', '', 'desc');

        expect(mockedApi.updateTest).toHaveBeenCalledWith(
            'u2',
            expect.objectContaining({ name: 'Fallback Name' })
        );
    });

    it('sets libraryError on failure', async () => {
        const test = createDefaultTest();
        useTestStore.setState({
            tests: [test],
            activeTestId: test.id,
            savedTests: [makeSavedTest({ id: 'u3' })],
        });
        mockedApi.updateTest.mockRejectedValue(new Error('Update fail'));

        await useTestStore.getState().updateSavedTest('u3', 'n', 'd');
        expect(useTestStore.getState().libraryError).toBe('Update fail');
    });
});

// ─── loadTestIntoBuilder ────────────────────────────────────────────────────

describe('loadTestIntoBuilder', () => {
    it('loads a saved test into the builder state', () => {
        const saved = makeSavedTest({ id: 'load-1', name: 'Loaded Test' });
        useTestStore.setState({ savedTests: [saved] });

        const name = useTestStore.getState().loadTestIntoBuilder('load-1');

        expect(name).toBe('Loaded Test');
        expect(useTestStore.getState().savedTestId).toBe('load-1');
        expect(useTestStore.getState().hasUnsavedChanges).toBe(false);
        expect(useTestStore.getState().testResponse).toBeNull();
        expect(useTestStore.getState().tests).toHaveLength(1);
    });

    it('backfills timeRange if missing', () => {
        const saved = makeSavedTest({ id: 'load-2' });
        // Remove timeRange from definition query
        (saved.definition.query as any).timeRange = undefined;
        useTestStore.setState({ savedTests: [saved] });

        useTestStore.getState().loadTestIntoBuilder('load-2');

        const loadedTest = useTestStore.getState().tests[0];
        expect(loadedTest.query.timeRange).toBeDefined();
        expect(loadedTest.query.timeRange.earliest).toBe('-24h@h');
    });

    it('throws and sets error when test not found', () => {
        useTestStore.setState({ savedTests: [] });
        expect(() => useTestStore.getState().loadTestIntoBuilder('missing')).toThrow('Test not found');
        expect(useTestStore.getState().libraryError).toBe('Test not found in library.');
    });

    it('backfills name from SavedTestFull.name if definition has no name', () => {
        const saved = makeSavedTest({ id: 'load-3', name: 'From Meta' });
        saved.definition.name = '';
        useTestStore.setState({ savedTests: [saved] });

        useTestStore.getState().loadTestIntoBuilder('load-3');
        expect(useTestStore.getState().tests[0].name).toBe('From Meta');
    });
});

// ─── deleteSavedTest ────────────────────────────────────────────────────────

describe('deleteSavedTest', () => {
    it('removes test from savedTests on success', async () => {
        const t1 = makeSavedTest({ id: 'd1' });
        const t2 = makeSavedTest({ id: 'd2' });
        useTestStore.setState({ savedTests: [t1, t2] });
        mockedApi.deleteTest.mockResolvedValue(undefined);

        await useTestStore.getState().deleteSavedTest('d1');

        expect(useTestStore.getState().savedTests).toHaveLength(1);
        expect(useTestStore.getState().savedTests[0].id).toBe('d2');
    });

    it('sets libraryError on failure without removing test', async () => {
        const t1 = makeSavedTest({ id: 'd3' });
        useTestStore.setState({ savedTests: [t1] });
        mockedApi.deleteTest.mockRejectedValue(new Error('Delete fail'));

        await useTestStore.getState().deleteSavedTest('d3');

        expect(useTestStore.getState().savedTests).toHaveLength(1);
        expect(useTestStore.getState().libraryError).toBe('Delete fail');
    });
});

// ─── clearLibraryError ──────────────────────────────────────────────────────

describe('clearLibraryError', () => {
    it('clears the error', () => {
        useTestStore.setState({ libraryError: 'some error' });
        useTestStore.getState().clearLibraryError();
        expect(useTestStore.getState().libraryError).toBeNull();
    });
});
