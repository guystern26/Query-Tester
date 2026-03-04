import React, { useRef, useEffect, useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { getSavedSearchSpl } from '../../api/splunkApi';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { Select, Message } from '../../common';

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

  const handleSplChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (test) state.loadSavedSearchSpl(test.id, e.target.value, null);
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

      <div className="relative">
        <textarea
          value={spl}
          onChange={handleSplChange}
          placeholder="index=main sourcetype=access_combined | stats count by src_ip"
          className="w-full min-h-[200px] px-3 py-3 text-[13px] leading-relaxed bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition resize-y"
        />
        <span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{spl.length} chars</span>
      </div>
    </div>
  );
}
