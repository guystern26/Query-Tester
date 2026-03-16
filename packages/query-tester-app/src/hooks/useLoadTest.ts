import { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { useLoadLastRun } from './useLoadLastRun';

export function useLoadTest(loadTestId?: string) {
    const state = useTestStore();
    const [isLoadingTest, setIsLoadingTest] = useState(false);
    const loadLastRun = useLoadLastRun();

    useEffect(() => {
        if (!loadTestId) {
            if (state.savedTestId) state.resetToNewTest();
            return;
        }
        const current = state.savedTests;
        if (current.length > 0) {
            try {
                state.loadTestIntoBuilder(loadTestId);
                loadLastRun(loadTestId);
            } catch {
                /* */
            }
            return;
        }
        setIsLoadingTest(true);
        state
            .fetchSavedTests()
            .then(() => {
                try {
                    state.loadTestIntoBuilder(loadTestId);
                    loadLastRun(loadTestId);
                } catch {
                    /* */
                }
                setIsLoadingTest(false);
            })
            .catch(() => {
                setIsLoadingTest(false);
            });
    }, [loadTestId]);

    return isLoadingTest;
}
