import { useState, useCallback, useEffect } from 'react';
import { getSavedSearches } from '../api/splunkApi';
import type { SavedSearch } from '../api/splunkApi';

export function useSavedSearches(app: string) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSearches = useCallback(async () => {
    if (!app.trim()) {
      setSavedSearches([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getSavedSearches(app);
      setSavedSearches(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved searches');
      setSavedSearches([]);
    } finally {
      setLoading(false);
    }
  }, [app]);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  return { savedSearches, loading, error, refetch: fetchSearches };
}
