import React from 'react';

/** Shared Tailwind class constants + thin wrappers for all config UIs. */

export const vInputCls =
  'bg-transparent border-0 text-xs text-slate-300 placeholder-slate-600 focus:outline-none';

export const vSelectCls =
  'bg-navy-950 border border-slate-800 rounded text-xs text-slate-300 px-1.5 py-1 cursor-pointer focus:outline-none focus:border-accent-600';

export const vWeightCls =
  'w-10 text-center bg-transparent border-0 text-xs text-slate-300 focus:outline-none';

/**
 * Header row — mirrors VRow padding exactly (including 1px transparent border)
 * so column labels align perfectly with inputs below.
 */
export function VHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 items-center px-2 py-0.5 mb-0.5 border border-transparent">
      {children}
    </div>
  );
}

export const vHeaderCls = 'text-[10px] text-slate-500 uppercase tracking-wider font-medium';

export function VRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5 items-center bg-navy-950 border border-slate-800 rounded-lg px-2 py-1.5 mb-1">
      {children}
    </div>
  );
}

export function VWeight({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 w-14 shrink-0">
      <input
        type="number"
        min={0}
        className={vWeightCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[10px] text-slate-500">%</span>
    </div>
  );
}

export function VDelBtn({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`border-none bg-transparent text-slate-600 p-0.5 rounded shrink-0 transition-colors ${
        disabled ? 'opacity-30 cursor-default' : 'cursor-pointer hover:text-red-400'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

export function VAddBtn({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 w-full text-xs font-medium mt-1.5 py-1.5 rounded-lg border border-dashed transition-all duration-200 cursor-pointer ${
        disabled
          ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500 bg-transparent'
          : 'border-accent-600/60 text-accent-300 bg-accent-900 hover:bg-accent-700/25 hover:border-accent-500'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

export function VHelper({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-600 italic m-0 mt-1">{children}</p>;
}
