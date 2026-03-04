import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { TestType } from 'core/types';

const NOTES: Record<TestType, string> = {
  standard: 'Your query runs against generated test data. Only unspecified fields use real Splunk data.',
  query_only: 'Your query runs directly against real Splunk data. No synthetic data injected.',
};

const DESCS: Record<TestType, string> = {
  standard: 'Define synthetic events with custom field values to test your query against controlled data.',
  query_only: 'Run your query directly against live Splunk data without injecting any synthetic events.',
};

interface Props { compact?: boolean; }

export function TestTypeSelector({ compact = false }: Props) {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const testType: TestType = activeTest?.testType ?? 'standard';

  const handleSelect = (type: TestType) => {
    if (activeTest) state.updateTestType(activeTest.id, type);
  };

  if (compact) {
    const pillBase = 'px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200';
    const pillActive = 'bg-accent-900 text-accent-300 border border-accent-700/50';
    const pillInactive = 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60';
    return (
      <div className="flex items-center gap-3 flex-1">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0">Type</span>
        <div className="flex bg-navy-950/80 rounded-xl p-0.5 border border-slate-700/60 gap-0.5 shrink-0">
          <button className={`${pillBase} ${testType === 'standard' ? pillActive : pillInactive}`} onClick={() => handleSelect('standard')}>Standard</button>
          <button className={`${pillBase} ${testType === 'query_only' ? pillActive : pillInactive}`} onClick={() => handleSelect('query_only')}>Query Only</button>
        </div>
        <span className="text-[11px] text-slate-500 italic leading-tight">{NOTES[testType]}</span>
      </div>
    );
  }

  const cardBase = 'flex-1 p-4 rounded-xl border cursor-pointer transition-all duration-200 text-left';
  const cardActive = 'border-accent-700/50 bg-accent-900';
  const cardInactive = 'border-slate-700 bg-navy-950/50 hover:border-slate-500 hover:bg-navy-900/60';

  return (
    <div className="flex flex-col gap-3 w-full">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider">Test Type</span>
      <div className="flex gap-3">
        {(['standard', 'query_only'] as TestType[]).map((type) => (
          <button key={type} className={`${cardBase} ${testType === type ? cardActive : cardInactive}`} onClick={() => handleSelect(type)}>
            <span className={`block text-sm font-semibold mb-1 ${testType === type ? 'text-accent-400' : 'text-slate-300'}`}>
              {type === 'standard' ? 'Standard' : 'Query Only'}
            </span>
            <span className="block text-xs text-slate-400 leading-relaxed">{DESCS[type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
