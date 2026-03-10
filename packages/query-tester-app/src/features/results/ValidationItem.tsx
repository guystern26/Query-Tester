/**
 * Single validation result row — shows pass/fail with humanized condition text.
 */
import React from 'react';
import type { ValidationDetail } from 'core/types';
import { humanizeCondition } from './resultHelpers';

export interface ValidationItemProps {
  v: ValidationDetail;
  fieldExistsInResults: boolean;
}

export function ValidationItem({ v, fieldExistsInResults }: ValidationItemProps) {
  const conditionText = humanizeCondition(v.condition);
  const needsValue = !['is_empty', 'is_not_empty'].includes(v.condition);

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded ${
      v.passed ? 'bg-green-400/5 border border-green-400/10' : 'bg-red-500/5 border border-red-500/10'
    }`}>
      <span className={`text-sm mt-0.5 ${v.passed ? 'text-green-400' : 'text-red-400'}`}>
        {v.passed ? '\u2713' : '\u2717'}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-[13px] flex flex-wrap items-baseline gap-1">
          <span className="font-medium text-slate-200">{v.field === '_result_count' ? 'Result count' : v.field}</span>
          <span className="text-slate-400">{conditionText}</span>
          {needsValue && (
            <span className="text-slate-300 font-mono text-[12px]">{v.expected}</span>
          )}
        </div>
        {!v.passed && v.message && (
          <div className="text-[12px] text-red-300/80">
            {v.message}
          </div>
        )}
        {!fieldExistsInResults && !v.field.startsWith('_') && (
          <div className="text-[11px] text-amber-400/80 mt-0.5">
            Field &quot;{v.field}&quot; was not found in the query results
          </div>
        )}
      </div>
    </div>
  );
}
