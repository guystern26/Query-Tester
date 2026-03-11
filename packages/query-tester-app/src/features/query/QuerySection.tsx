import React, { useRef, useEffect, useState, useCallback } from 'react';
// Ace must be loaded before Input to set up window.ace and SPL mode
import '@splunk/react-search/components/Ace';
import SearchInput from '@splunk/react-search/components/Input';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { getSavedSearchSpl } from '../../api/splunkApi';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { Select, Message } from '../../common';
import { TimeRangePicker } from './TimeRangePicker';
import { lintSpl, SplWarning } from './splLinter';

import { useAceMarkers } from './useAceMarkers';

const APP_CHANGE_MSG = 'You changed the app. Some lookups and saved searches may not be available.';

export function QuerySection() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  const app = test?.app ?? '';
  const spl = test?.query.spl ?? '';
  const origin = test?.query.savedSearchOrigin ?? '';

  const { savedSearches, loading, error } = useSavedSearches(app);

  const prevApp = useRef(app);
  const [appChanged, setAppChanged] = useState(false);
  const [splWarnings, setSplWarnings] = useState<SplWarning[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Clear warnings while user is editing, re-lint on blur
  const handleEditorFocus = useCallback(() => {
    setSplWarnings([]);
  }, []);

  const handleEditorBlur = useCallback(() => {
    setSplWarnings(lintSpl(spl));
  }, [spl]);

  // Apply inline Ace markers + gutter annotations + hover tooltips
  useAceMarkers(editorRef, splWarnings);

  useEffect(() => {
    if (app !== prevApp.current && prevApp.current !== '') setAppChanged(true);
    prevApp.current = app;
  }, [app]);

  const options = [
    { value: '', label: 'Select a saved search...' },
    ...savedSearches.map((s) => ({ value: s.name, label: s.name })),
  ];

  const handleSavedSearch = async (value: string) => {
    if (!test || !app || !value) return;
    try {
      const content = await getSavedSearchSpl(app, value);
      state.loadSavedSearchSpl(test.id, content, value);
    } catch { /* leave SPL unchanged */ }
  };

  const handleSplChange = (_e: React.SyntheticEvent, { value }: { value: string }) => {
    if (test) state.updateSpl(test.id, value);
  };

  return (
    <div className="flex flex-col gap-3">
      {appChanged && (
        <Message type="warning" dismissible onDismiss={() => setAppChanged(false)}>
          {APP_CHANGE_MSG}
        </Message>
      )}

      <div>
        <label className="block mb-1 text-slate-400 text-[13px]">Load from saved search</label>
        <Select value={origin} options={options} onChange={handleSavedSearch} disabled={loading} />
        {error && <div className="mt-1 text-[13px] text-red-400">{error}</div>}
      </div>

      <div className="flex gap-3 items-start">
        <div
          ref={editorRef}
          className="relative flex-1 min-w-0"
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
        >
          <SearchInput
            value={spl}
            onChange={handleSplChange}
            placeholder="index=main sourcetype=access_combined | stats count by src_ip"
            minLines={6}
            maxLines={20}
            showLineNumbers
          />
          <span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{spl.length} chars</span>
        </div>

        {test && (
          <div className="flex-shrink-0 pt-0.5">
            <TimeRangePicker
              value={test.query.timeRange}
              onChange={(tr) => state.setTimeRange(test.id, tr)}
            />
          </div>
        )}
      </div>

    </div>
  );
}
