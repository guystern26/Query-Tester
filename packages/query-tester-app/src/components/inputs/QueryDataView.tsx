/**
 * QueryDataView — input mode where a sub-query's results become test data.
 * Layout mirrors QuerySection: saved search dropdown above, Ace editor + time picker side by side.
 */
import React from 'react';
import '@splunk/react-search/components/Ace';
import SearchInput from '@splunk/react-search/components/Input';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectInput } from 'core/store/selectors';
import type { EntityId } from 'core/types';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { Select } from '../../common';
import { TimeRangePicker } from '../../features/query/TimeRangePicker';
import { MAX_QUERY_DATA_EVENTS } from 'core/constants/limits';

export interface QueryDataViewProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
}

export function QueryDataView({ testId, scenarioId, inputId }: QueryDataViewProps) {
  const test = useTestStore(selectActiveTest);
  const input = useTestStore((s) => selectInput(s, scenarioId, inputId));
  const updateQueryDataSpl = useTestStore((s) => s.updateQueryDataSpl);
  const updateQueryDataSavedSearch = useTestStore((s) => s.updateQueryDataSavedSearch);
  const updateQueryDataTimeRange = useTestStore((s) => s.updateQueryDataTimeRange);
  const fetchQueryDataSavedSearchSpl = useTestStore((s) => s.fetchQueryDataSavedSearchSpl);
  const config = input?.queryDataConfig;
  const spl = config?.spl ?? '';
  const savedSearchName = config?.savedSearchName ?? '';
  const timeRange = config?.timeRange ?? { earliest: '-24h@h', latest: 'now', label: 'Last 24 hours' };

  const app = test?.app ?? '';
  const { savedSearches, loading, error } = useSavedSearches(app);

  const options = [
    { value: '', label: 'Select a saved search...' },
    ...savedSearches.map((s) => ({ value: s.name, label: s.name })),
  ];

  const handleSavedSearch = async (value: string) => {
    if (!app || !value) return;
    try {
      await fetchQueryDataSavedSearchSpl(testId, scenarioId, inputId, app, value);
    } catch { /* leave SPL unchanged */ }
  };

  const handleSplChange = (_e: React.SyntheticEvent, { value }: { value: string }) => {
    updateQueryDataSpl(testId, scenarioId, inputId, value);
    updateQueryDataSavedSearch(testId, scenarioId, inputId, null);
  };

  const isEmpty = spl.trim() === '';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13px] text-slate-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Write a SPL query whose results will be used as test input data (up to {MAX_QUERY_DATA_EVENTS.toLocaleString()} events)</span>
      </div>

      <div>
        <label className="block mb-1 text-slate-400 text-[13px]">Load from saved search</label>
        <Select value={savedSearchName} options={options} onChange={handleSavedSearch} disabled={loading} />
        {error && <div className="mt-1 text-[13px] text-red-400">{error}</div>}
      </div>

      <div className="flex gap-3 items-start">
        <div className="relative flex-1 min-w-0">
          <SearchInput
            value={spl}
            onChange={handleSplChange}
            placeholder="index=my_data sourcetype=my_type | head 100"
            minLines={4}
            maxLines={14}
            showLineNumbers
          />
          <span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{spl.length} chars</span>
        </div>

        <div className="flex-shrink-0 pt-0.5">
          <TimeRangePicker
            value={timeRange}
            onChange={(tr) => updateQueryDataTimeRange(testId, scenarioId, inputId, tr)}
          />
        </div>
      </div>

      {isEmpty && (
        <div className="text-[12px] text-amber-400/80">
          Enter a SPL query above. Its results will be indexed as test data for this input.
        </div>
      )}
    </div>
  );
}
