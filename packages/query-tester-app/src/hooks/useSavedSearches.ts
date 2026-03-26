import { useState, useEffect, useCallback } from 'react';
import { getSavedSearches } from '../api/splunkApi';
import type { SavedSearch } from '../api/splunkApi';

export function useSavedSearches(app: string) {
    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(() => {
        if (!app.trim()) return;
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        getSavedSearches(app)
            .then((list) => {
                if (!controller.signal.aborted) {
                    setSavedSearches(list);
                }
            })
            .catch((e) => {
                if (!controller.signal.aborted) {
                    setError(e instanceof Error ? e.message : 'Failed to load saved searches');
                    setSavedSearches([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        return controller;
    }, [app]);

    useEffect(() => {
        if (!app.trim()) {
            setSavedSearches([]);
            setError(null);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        getSavedSearches(app)
            .then((list) => {
                if (!controller.signal.aborted) {
                    setSavedSearches(list);
                }
            })
            .catch((e) => {
                if (!controller.signal.aborted) {
                    setError(e instanceof Error ? e.message : 'Failed to load saved searches');
                    setSavedSearches([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [app]);

    return { savedSearches, loading, error, refetch };
}
