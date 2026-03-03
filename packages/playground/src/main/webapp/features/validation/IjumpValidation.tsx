import React, { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import {
  type IjumpSubMode,
  isIJumpLockedField,
  createIJumpBaseGroups,
  updateIJumpSubMode,
  detectSubMode,
} from './utils/ijumpHelpers';
import { TimeCard, ReasonCard, StatusCard, AndDivider } from './IjumpLockedCards';
import { IjumpCustomConditions } from './IjumpCustomConditions';

/* ── icons ─────────────────────────────────────────────────── */

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/* ── main component ────────────────────────────────────────── */

export function IjumpValidation() {
  const store = useTestStore();
  const test = selectActiveTest(store);

  const [subMode, setSubMode] = useState<IjumpSubMode>('jumping');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!test || initialized) return;
    const groups = test.validation.fieldGroups;
    const hasTime = groups.some((g) => g.field === '_time');
    const hasReason = groups.some((g) => g.field === 'reason');
    const hasStatus = groups.some((g) => g.field === 'status');

    if (hasTime && hasReason && hasStatus) {
      setSubMode(detectSubMode(groups));
    } else {
      const baseGroups = createIJumpBaseGroups('jumping');
      const custom = groups.filter((g) => !isIJumpLockedField(g.field));
      store.replaceAllFieldGroups(test.id, [...baseGroups, ...custom]);
      setSubMode('jumping');
    }
    setInitialized(true);
  }, [test?.id]);

  if (!test) return null;

  const groups = test.validation.fieldGroups;
  const reasonGroup = groups.find((g) => g.field === 'reason');

  const handleSubModeChange = (newMode: IjumpSubMode) => {
    if (newMode === subMode) return;
    const updated = updateIJumpSubMode(groups, newMode);
    store.replaceAllFieldGroups(test.id, updated);
    setSubMode(newMode);
  };

  const segBase = 'flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-lg transition-all duration-200 cursor-pointer';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-700 w-fit gap-0.5">
        <button
          className={`${segBase} ${subMode === 'jumping' ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          onClick={() => handleSubModeChange('jumping')}
        >
          <ZapIcon /> Jumping Alert
        </button>
        <button
          className={`${segBase} ${subMode === 'monitoring' ? 'bg-green-600 text-white shadow-sm shadow-green-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          onClick={() => handleSubModeChange('monitoring')}
        >
          <MonitorIcon /> Monitoring Alert
        </button>
      </div>

      <TimeCard />
      <AndDivider />
      <ReasonCard testId={test.id} group={reasonGroup ?? null} />
      <AndDivider />
      <StatusCard subMode={subMode} />

      <IjumpCustomConditions testId={test.id} groups={groups} />
    </div>
  );
}
