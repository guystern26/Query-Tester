/**
 * FieldNameSelector — hybrid text input + dropdown of AI-suggested field names.
 * Replaces the plain field name text input on FieldGroupCard.
 */
import React, { useState, useRef, useEffect } from 'react';
import type { EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

export interface FieldNameSelectorProps {
  testId: EntityId;
  groupId: EntityId;
  value: string;
  className?: string;
}

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function FieldNameSelector({ testId, groupId, value, className = '' }: FieldNameSelectorProps) {
  const test = useTestStore(selectActiveTest);
  const updateFieldGroupField = useTestStore((s) => s.updateFieldGroupField);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Get suggested fields from field extraction (output fields)
  const suggested = test?.fieldExtraction?.sources.flatMap((s) => s.fields) || [];
  // Deduplicate
  const uniqueSuggested = Array.from(new Set(suggested));
  const hasSuggestions = uniqueSuggested.length > 0;

  // Filter suggestions by current input
  const filtered = value.trim()
    ? uniqueSuggested.filter((f) => f.toLowerCase().includes(value.toLowerCase()))
    : uniqueSuggested;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (field: string) => {
    updateFieldGroupField(testId, groupId, field);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex">
        <input
          value={value}
          onChange={(e) => updateFieldGroupField(testId, groupId, e.target.value)}
          onFocus={() => { if (hasSuggestions) setOpen(true); }}
          placeholder="Field name (e.g., status, reason)"
          className={`flex-1 min-w-0 px-2.5 py-1.5 text-[13px] bg-navy-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition font-semibold ${
            hasSuggestions ? 'rounded-l-lg border-r-0' : 'rounded-lg'
          }`}
        />
        {hasSuggestions && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`px-1.5 bg-navy-950 border border-slate-700 rounded-r-lg text-slate-400 hover:text-slate-200 cursor-pointer transition flex items-center ${
              open ? 'border-accent-600 text-slate-200' : ''
            }`}
            title="Select from extracted fields"
          >
            <ChevronDown />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-navy-900 border border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
          {filtered.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleSelect(f)}
              className="w-full text-left px-3 py-1.5 text-[13px] text-slate-200 hover:bg-navy-800 cursor-pointer transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
