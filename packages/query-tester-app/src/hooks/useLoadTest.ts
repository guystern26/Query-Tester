import { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { useLoadLastRun } from './useLoadLastRun';

export function useLoadTest(loadTestId?: string): { isLoadingTest: boolean; loadError: string | null } {
    const savedTests = useTestStore((s) => s.savedTests);
    const fetchSavedTests = useTestStore((s) => s.fetchSavedTests);
    const loadTestIntoBuilder = useTestStore((s) => s.loadTestIntoBuilder);
    const [isLoadingTest, setIsLoadingTest] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const loadLastRun = useLoadLastRun();

    useEffect(() => {
        const controller = new AbortController();
        setLoadError(null);
        // No test_id → keep whatever is in the builder ("last edited test").
        // Resets happen explicitly via addTest/resetToNewTest from the UI.
        if (!loadTestId) return;

        const tryLoad = () => {
            if (controller.signal.aborted) return;
            const { savedTests: currentTests } = useTestStore.getState();
            const found = currentTests.find((t) => t.id === loadTestId);
            if (!found) {
                if (!controller.signal.aborted) {
                    setLoadError(
                        'Test not found. It may have been deleted, or you may not have access.'
                    );
                }
                return;
            }
            try {
                loadTestIntoBuilder(loadTestId);
                loadLastRun(loadTestId);
            } catch (e) {
                if (!controller.signal.aborted) {
                    setLoadError(e instanceof Error ? e.message : 'Failed to load test.');
                }
            }
        };

        const current = savedTests;
        if (current.length > 0) {
            tryLoad();
            return () => controller.abort();
        }
        setIsLoadingTest(true);
        fetchSavedTests()
            .then(() => {
                if (!controller.signal.aborted) {
                    tryLoad();
                    setIsLoadingTest(false);
                }
            })
            .catch((e: unknown) => {
                if (!controller.signal.aborted) {
                    setLoadError(
                        'Failed to load test library: ' +
                            (e instanceof Error ? e.message : String(e))
                    );
                    setIsLoadingTest(false);
                }
            });

        return () => controller.abort();
    }, [loadTestId]);

    return { isLoadingTest, loadError };
}
