import React, { useState } from 'react';
import type { ScenarioResult, FieldValidationResult } from 'core/types';

function MultiValue({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const lines = value.split('\n');
  return (
    <div>
      <span className="text-slate-400">{label}: </span>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

export interface ScenarioResultCardProps {
  result: ScenarioResult;
}

export function ScenarioResultCard({ result }: ScenarioResultCardProps) {
  const [open, setOpen] = useState(!result.passed);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-2.5 cursor-pointer transition-colors hover:bg-slate-700/50"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-sm flex items-center gap-2 text-slate-200">
          {result.scenarioName || 'Unnamed scenario'}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
            result.passed
              ? 'bg-green-400/15 text-green-400'
              : 'bg-red-500/15 text-red-300'
          }`}>
            {result.passed ? 'PASS' : 'FAIL'}
          </span>
        </span>
        <span className={`text-slate-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {result.inputResults.map((ir, idx) => (
            <div key={ir.inputId} className="pt-2 border-t border-slate-700 flex flex-col gap-1.5">
              <div className="text-[13px] text-slate-400">
                Input {idx + 1} &middot; <span className={ir.passed ? 'text-green-400' : 'text-red-300'}>{ir.passed ? 'Passed' : 'Failed'}</span>
              </div>
              {ir.eventResults.map((er) => (
                <div key={er.eventIndex} className="p-2 rounded-md bg-slate-900/60">
                  <div className={`text-[13px] mb-1 ${er.passed ? 'text-green-400' : 'text-red-300'}`}>
                    Event {er.eventIndex + 1}
                    {er.error && <span className="text-red-300"> &mdash; {er.error}</span>}
                  </div>
                  {er.fieldValidations.map((fv: FieldValidationResult) => (
                    <div key={fv.field} className={`text-[13px] mb-0.5 ${fv.passed ? 'text-green-400' : 'text-red-300'}`}>
                      <strong>{fv.field}</strong>
                      {fv.message && <span> &mdash; {fv.message}</span>}
                      {!fv.passed && (
                        <div className="ml-2">
                          <MultiValue label="Expected" value={fv.expected} />
                          <MultiValue label="Actual" value={fv.actual} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
