import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, inputHasData } from 'core/store/selectors';
import type { TestType } from 'core/types';
import { Modal } from '../../common';

const LABELS: Record<TestType, string> = {
  standard: 'Synthetic Data',
  query_only: 'Real Data',
};

const DESCS: Record<TestType, string> = {
  standard: 'Define synthetic events with custom field values to test your query against controlled, mock data.',
  query_only: 'Run your query directly against live Splunk data — no data simulation or injection.',
};

interface Props { compact?: boolean; onTypeChosen?: () => void; }

export function TestTypeSelector({ compact = false, onTypeChosen }: Props) {
  const activeTest = useTestStore(selectActiveTest);
  const updateTestType = useTestStore((s) => s.updateTestType);
  const clearResults = useTestStore((s) => s.clearResults);
  const testType: TestType = activeTest?.testType ?? 'standard';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [hasChosen, setHasChosen] = useState(false);

  const handleSelect = (type: TestType) => {
    if (!activeTest) return;
    if (type === testType && hasChosen) {
      // Already chosen this type, just confirm again
      setHasChosen(true);
      if (onTypeChosen) onTypeChosen();
      return;
    }
    if (type === 'query_only') {
      setConfirmMsg(
        inputHasData(activeTest.scenarios)
          ? 'Switching to Real Data mode will ignore all synthetic test data. Your data is preserved if you switch back.'
          : 'Your query will run directly against real Splunk data — no synthetic data will be injected.'
      );
      setConfirmOpen(true);
      return;
    }
    // Standard/synthetic — apply immediately
    updateTestType(activeTest.id, type);
    clearResults();
    setHasChosen(true);
    if (onTypeChosen) onTypeChosen();
  };

  const handleConfirm = () => {
    if (activeTest) {
      updateTestType(activeTest.id, 'query_only');
      clearResults();
    }
    setHasChosen(true);
    if (onTypeChosen) onTypeChosen();
    setConfirmOpen(false);
  };

  if (compact) {
    const pillBase = 'px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors duration-300';
    const pillActive = 'bg-navy-700 text-white border-2 border-slate-600';
    const pillInactive = 'text-slate-600 border-2 border-transparent hover:text-slate-400';
    return (
      <>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider shrink-0">Type</span>
          <div className="flex rounded-lg p-0.5 gap-0.5 shrink-0">
            <button className={`${pillBase} ${testType === 'standard' ? pillActive : pillInactive}`} onClick={() => handleSelect('standard')}>{LABELS.standard}</button>
            <button data-tutorial="query-only" className={`${pillBase} ${testType === 'query_only' ? pillActive : pillInactive}`} onClick={() => handleSelect('query_only')}>{LABELS.query_only}</button>
          </div>
        </div>
        <Modal open={confirmOpen} title="Switch to Real Data?" onClose={() => setConfirmOpen(false)} confirmLabel="Switch" onConfirm={handleConfirm}>
          <p className="m-0 text-sm text-slate-300">{confirmMsg}</p>
        </Modal>
      </>
    );
  }

  const cardBase = 'flex-1 p-4 rounded-lg cursor-pointer transition-colors duration-300 text-left';
  const cardActive = 'border-2 border-slate-600 bg-navy-700';
  const cardInactive = 'border border-slate-700 bg-navy-950/50 hover:border-slate-500';

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">Test Type</span>
        <div className="flex gap-3">
          {(['standard', 'query_only'] as TestType[]).map((type) => {
            var isActive = hasChosen && testType === type;
            return (
            <button key={type} className={`${cardBase} ${isActive ? cardActive : cardInactive}`} onClick={() => handleSelect(type)}>
              <span className={`block text-sm font-semibold mb-1 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {LABELS[type]}
              </span>
              <span className="block text-xs text-slate-400 leading-relaxed">{DESCS[type]}</span>
            </button>
            );
          })}
        </div>
      </div>
      <Modal open={confirmOpen} title="Switch to Real Data?" onClose={() => setConfirmOpen(false)} confirmLabel="Switch" onConfirm={handleConfirm}>
        <p className="m-0 text-sm text-slate-300">{confirmMsg}</p>
      </Modal>
    </>
  );
}
