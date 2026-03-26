/**
 * ExtractFieldsButton — AI-powered button that extracts data sources + fields from SPL
 * and auto-populates the current scenario's inputs.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

type Phase = 'idle' | 'loading' | 'done' | 'error' | 'stale';

const STALE_MSG = 'Query changed — re-extract to update fields.';

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

export interface ExtractFieldsButtonProps {
  testId: EntityId;
  scenarioId: EntityId;
}

export function ExtractFieldsButton({ testId, scenarioId }: ExtractFieldsButtonProps) {
  const test = useTestStore(selectActiveTest);
  const fetchExtractDataSources = useTestStore((s) => s.fetchExtractDataSources);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const lastSplRef = React.useRef<string | null>(null);
  const currentSpl = test?.query?.spl ?? '';

  useEffect(() => {
    if (phase === 'error') {
      const t = setTimeout(() => { setPhase('idle'); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => setPhase('idle'), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Mark stale when SPL changes after a successful run
  useEffect(() => {
    if (lastSplRef.current !== null && currentSpl !== lastSplRef.current) {
      if (phase === 'idle' || phase === 'done') setPhase('stale');
    }
  }, [currentSpl, phase]);

  const handleClick = useCallback(async () => {
    if (!test) return;
    const spl = test.query.spl.trim();
    if (!spl) { setError('Enter a query first.'); setPhase('error'); return; }

    setPhase('loading');
    try {
      await fetchExtractDataSources(testId, scenarioId, spl);
      lastSplRef.current = test.query.spl;
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [test, testId, scenarioId, fetchExtractDataSources]);

  const isStale = phase === 'stale';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={phase === 'loading'}
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200 cursor-pointer border ${
          phase === 'done'
            ? 'bg-green-600/20 border-green-500/30 text-green-400'
            : isStale
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse'
              : phase === 'loading'
                ? 'bg-navy-800 border-slate-700 text-slate-400 cursor-wait'
                : 'bg-navy-800 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400'
        } disabled:cursor-wait`}
      >
        {phase === 'loading' ? <SpinnerIcon /> : phase === 'done' ? null : <SparkleIcon />}
        {phase === 'loading' ? 'Extracting\u2026' : phase === 'done' ? '\u2713 Done' : 'Extract Fields'}
      </button>

      {isStale && (
        <span className="text-[12px] text-amber-400/80">{STALE_MSG}</span>
      )}
      {phase === 'error' && error && (
        <span className="text-[12px] text-red-400">{error}</span>
      )}
    </div>
  );
}
