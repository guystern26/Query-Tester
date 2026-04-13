/**
 * SuggestFieldsButton — AI-powered button that suggests validation fields from SPL.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

type Phase = 'idle' | 'loading' | 'done' | 'error' | 'stale';

const STALE_MSG = 'Query changed — re-suggest for updated results.';

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

export function SuggestFieldsButton() {
  const test = useTestStore(selectActiveTest);
  const fetchSuggestValidationFields = useTestStore((s) => s.fetchSuggestValidationFields);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const lastSplRef = React.useRef<string | null>(null);
  const currentSpl = test?.query?.spl ?? '';

  useEffect(() => {
    if (phase === 'error') {
      const t = setTimeout(() => { setPhase('idle'); setMessage(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => { setPhase('idle'); setMessage(''); }, 2500);
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
    if (!spl) { setMessage('Enter a query first.'); setPhase('error'); return; }

    setPhase('loading');
    try {
      const { newCount } = await fetchSuggestValidationFields(test.id, spl);
      lastSplRef.current = test.query.spl;
      if (newCount > 0) {
        setMessage('Added ' + newCount + ' field' + (newCount !== 1 ? 's' : ''));
      } else {
        setMessage('All fields already present');
      }
      setPhase('done');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [test, fetchSuggestValidationFields]);

  const isStale = phase === 'stale';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={phase === 'loading'}
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors duration-200 cursor-pointer border ${
          phase === 'done'
            ? 'bg-green-600/20 border-green-500/30 text-green-400'
            : isStale
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse'
              : phase === 'loading'
                ? 'border-slate-700 text-slate-400 cursor-wait'
                : 'border-slate-600 text-blue-300 hover:border-slate-500 hover:text-blue-200'
        } disabled:cursor-wait`}
      >
        {phase === 'loading' ? <SpinnerIcon /> : phase === 'done' ? null : <SparkleIcon />}
        {phase === 'loading' ? 'Analyzing\u2026' : phase === 'done' ? '\u2713 Done' : 'Suggest Fields'}
      </button>

      {isStale && (
        <div className="text-[12px] px-1 text-amber-400/80">{STALE_MSG}</div>
      )}
      {(phase === 'error' || phase === 'done') && message && (
        <div className={`text-[12px] px-1 ${phase === 'error' ? 'text-red-400' : 'text-green-400/80'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
