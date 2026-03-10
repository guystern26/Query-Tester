/**
 * SuggestFieldsButton — AI-powered button that suggests validation fields from SPL.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { extractValidationFields } from '../../api/llmApi';

type Phase = 'idle' | 'loading' | 'done' | 'error';

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
  const store = useTestStore();
  const test = selectActiveTest(store);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');

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

  const handleClick = useCallback(async () => {
    if (!test) return;
    const spl = test.query.spl.trim();
    if (!spl) { setMessage('Enter a query first.'); setPhase('error'); return; }

    setPhase('loading');
    try {
      const fields = await extractValidationFields(spl);
      const existingFields = new Set(test.validation.fieldGroups.map((g) => g.field));
      const newFields = fields.filter((f) => !existingFields.has(f));

      store.applySuggestedValidationFields(test.id, fields);

      if (newFields.length > 0) {
        setMessage('Added ' + newFields.length + ' field' + (newFields.length !== 1 ? 's' : ''));
      } else {
        setMessage('All fields already present');
      }
      setPhase('done');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [test, store]);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={phase === 'loading'}
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200 cursor-pointer border ${
          phase === 'done'
            ? 'bg-green-600/20 border-green-500/30 text-green-400'
            : phase === 'loading'
              ? 'bg-navy-800 border-slate-700 text-slate-400 cursor-wait'
              : 'bg-navy-800 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-blue-400'
        } disabled:cursor-wait`}
      >
        {phase === 'loading' ? <SpinnerIcon /> : phase === 'done' ? null : <SparkleIcon />}
        {phase === 'loading' ? 'Analyzing\u2026' : phase === 'done' ? '\u2713 Done' : 'Suggest Fields'}
      </button>

      {(phase === 'error' || phase === 'done') && message && (
        <div className={`text-[12px] px-1 ${phase === 'error' ? 'text-red-400' : 'text-green-400/80'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
