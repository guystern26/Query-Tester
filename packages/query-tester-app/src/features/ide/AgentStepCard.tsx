/**
 * AgentStepCard — Collapsible card showing an agent pipeline step.
 * Displays type badge, SPL preview, status, and result summary.
 */
import React, { useState } from 'react';
import type { AgentStep } from './agentLoop';

const TYPE_LABELS: Record<AgentStep['type'], string> = {
    auto_query: 'Query',
    debug_step: 'Debug',
    validation: 'Validate',
};

const STATUS_COLORS: Record<AgentStep['status'], string> = {
    running: 'text-blue-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
    blocked: 'text-amber-400',
};

interface AgentStepCardProps {
    step: AgentStep;
}

export function AgentStepCard({ step }: AgentStepCardProps): React.ReactElement {
    const [expanded, setExpanded] = useState(false);

    const typeLabel = TYPE_LABELS[step.type] || step.type;
    const statusColor = STATUS_COLORS[step.status] || 'text-slate-400';

    return (
        <div className="border border-slate-700/40 rounded bg-navy-950/50 text-[11px]">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-navy-800/40 transition"
            >
                <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-medium shrink-0">
                    {typeLabel}
                </span>
                <span className="flex-1 text-left text-slate-400 truncate">
                    {step.label || step.spl?.slice(0, 60) || 'Processing...'}
                </span>
                <StatusIcon status={step.status} className={statusColor} />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" className={'text-slate-500 transition ' + (expanded ? 'rotate-180' : '')}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {expanded && (
                <div className="px-2 pb-2 pt-1 border-t border-slate-700/30">
                    {step.spl && (
                        <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap mb-1 max-h-20 overflow-y-auto">
                            {step.spl}
                        </pre>
                    )}
                    {step.error && <p className="text-red-400 text-[10px]">{step.error}</p>}
                    {step.resultCount !== undefined && (
                        <p className="text-slate-500 text-[10px]">{step.resultCount} results</p>
                    )}
                </div>
            )}
        </div>
    );
}

function StatusIcon({ status, className }: { status: AgentStep['status']; className: string }): React.ReactElement {
    if (status === 'running') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" className={className + ' animate-spin'}>
                <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
        );
    }
    if (status === 'success') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" className={className}>
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
    }
    if (status === 'error') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" className={className}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        );
    }
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" className={className}>
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" />
        </svg>
    );
}
