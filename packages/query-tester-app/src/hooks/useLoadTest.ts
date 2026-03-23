import { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { useLoadLastRun } from './useLoadLastRun';

export function useLoadTest(loadTestId?: string) {
    const state = useTestStore();
    const [isLoadingTest, setIsLoadingTest] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const loadLastRun = useLoadLastRun();

    useEffect(() => {
        setLoadError(null);
        if (!loadTestId) {
            if (state.savedTestId) state.resetToNewTest();
            return;
        }

        const tryLoad = () => {
            const { savedTests } = useTestStore.getState();
            const found = savedTests.find((t) => t.id === loadTestId);
            if (!found) {
                setLoadError(
                    'Test not found. It may have been deleted, or you may not have access.'
                );
                return;
            }
            try {
                state.loadTestIntoBuilder(loadTestId);
                loadLastRun(loadTestId);
            } catch (e) {
                setLoadError(e instanceof Error ? e.message : 'Failed to load test.');
            }
        };

        const current = state.savedTests;
        if (current.length > 0) {
            tryLoad();
            return;
        }
        setIsLoadingTest(true);
        state
            .fetchSavedTests()
            .then(() => {
                tryLoad();
                setIsLoadingTest(false);
            })
            .catch((e) => {
                setLoadError(
                    'Failed to load test library: ' +
                        (e instanceof Error ? e.message : String(e))
                );
                setIsLoadingTest(false);
            });
    }, [loadTestId]);

    return { isLoadingTest, loadError };
}
