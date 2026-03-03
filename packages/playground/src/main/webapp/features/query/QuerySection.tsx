import React, { useRef, useEffect, useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { getSavedSearchSpl } from '../../api/splunkApi';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { TextArea, Select, Message } from '../../common';

const APP_CHANGE_MESSAGE =
  'You changed the app. Some lookups and saved searches may not be available.';

export function QuerySection() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const app = activeTest?.app ?? '';
  const spl = activeTest?.query.spl ?? '';
  const savedSearchOrigin = activeTest?.query.savedSearchOrigin ?? '';

  const { savedSearches, loading, error, refetch } = useSavedSearches(app);

  const prevAppRef = useRef(app);
  const [showAppChangeMessage, setShowAppChangeMessage] = useState(false);

  useEffect(() => {
    if (app !== prevAppRef.current && prevAppRef.current !== '') {
      setShowAppChangeMessage(true);
    }
    prevAppRef.current = app;
  }, [app]);

  const savedSearchOptions = [
    { value: '', label: '— Select saved search —' },
    ...savedSearches.map((s) => ({ value: s.name, label: s.name })),
  ];

  const handleSplChange = (value: string) => {
    if (activeTest) state.loadSavedSearchSpl(activeTest.id, value, null);
  };

  const handleSavedSearchChange = async (value: string) => {
    if (!activeTest || !app || !value) return;
    try {
      const splContent = await getSavedSearchSpl(app, value);
      state.loadSavedSearchSpl(activeTest.id, splContent, value);
    } catch {
      // leave SPL unchanged on fetch error
    }
  };

  return (
    <div
      style={{
        padding: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {showAppChangeMessage && (
        <div style={{ marginBottom: 'var(--radius-md)' }}>
          <Message type="warning" dismissible onDismiss={() => setShowAppChangeMessage(false)}>
            {APP_CHANGE_MESSAGE}
          </Message>
        </div>
      )}

      <div style={{ marginBottom: 'var(--radius-md)' }}>
        <label style={{ display: 'block', marginBottom: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Saved search
        </label>
        <Select
          value={savedSearchOrigin}
          options={savedSearchOptions}
          onChange={handleSavedSearchChange}
          disabled={loading}
        />
        {error && (
          <div style={{ marginTop: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--error)' }}>
            {error}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          SPL query
        </label>
        <TextArea
          value={spl}
          onChange={handleSplChange}
          placeholder="Enter SPL query..."
          rows={6}
          style={{ fontFamily: 'var(--font-mono, monospace)' }}
        />
      </div>
    </div>
  );
}
