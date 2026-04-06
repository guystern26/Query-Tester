/**
 * SplWarningOverlay — renders yellow/red underline highlights over the SPL
 * editor text, with hover tooltips explaining each warning.
 *
 * Positioned absolutely over the Ace editor's content area.
 * Each warning is a transparent span that covers the exact character range
 * and shows a tooltip on hover.
 */
import React, { useState } from 'react';
import type { SplWarning } from './splLinter';

interface Props {
  warnings: SplWarning[];
  spl: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  error: {
    bg: 'bg-red-500/15',
    border: 'border-b-2 border-red-400',
    dot: 'bg-red-400',
  },
  warning: {
    bg: 'bg-yellow-500/15',
    border: 'border-b-2 border-yellow-400',
    dot: 'bg-yellow-400',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-b-2 border-blue-400/60 border-dashed',
    dot: 'bg-blue-400',
  },
};

export function SplWarningOverlay({ warnings, spl }: Props) {
  if (!warnings.length || !spl) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {warnings.map((w, i) => (
        <WarningBadge key={`${w.start}-${w.end}-${i}`} warning={w} spl={spl} />
      ))}
    </div>
  );
}

function WarningBadge({ warning, spl }: { warning: SplWarning; spl: string }) {
  const [hovered, setHovered] = useState(false);
  const style = SEVERITY_STYLES[warning.severity] || SEVERITY_STYLES.warning;

  // Build context snippet: a few chars before and after the token
  const ctxStart = Math.max(0, warning.start - 15);
  const ctxEnd = Math.min(spl.length, warning.end + 15);
  const before = (ctxStart > 0 ? '...' : '') + spl.slice(ctxStart, warning.start);
  const token = spl.slice(warning.start, warning.end);
  const after = spl.slice(warning.end, ctxEnd) + (ctxEnd < spl.length ? '...' : '');

  return (
    <div
      className="relative inline-flex items-start gap-2 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${style.dot}`} />
      <div className="text-[12px] leading-relaxed">
        <span className="text-slate-500 font-mono">{before}</span>
        <span className={`font-mono font-semibold ${style.border} ${style.bg} px-0.5 rounded-sm cursor-help ${
          warning.severity === 'error' ? 'text-red-300' : warning.severity === 'warning' ? 'text-yellow-300' : 'text-blue-300'
        }`}>
          {token}
        </span>
        <span className="text-slate-500 font-mono">{after}</span>
        <span className="ml-2 text-slate-400">{warning.message}</span>
      </div>
    </div>
  );
}
