import React from 'react';

const TH = 'px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider';
const COLUMNS = ['Name', 'App', 'Type', 'Linked Alert', 'Schedule', 'Last Run', 'Status', '', 'Actions'];

function SkeletonRow() {
    return (
        <tr className="border-b border-slate-800">
            {COLUMNS.map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 bg-navy-700 rounded animate-pulse" style={{ width: i === 3 ? '80%' : '60%' }} />
                </td>
            ))}
        </tr>
    );
}

export function LoadingState() {
    return (
        <div className="bg-navy-900 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-700">
                        {COLUMNS.map((c, i) => (
                            <th key={i} className={TH}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </tbody>
            </table>
        </div>
    );
}

export function EmptyState() {
    return (
        <div className="bg-navy-900 rounded-xl border border-slate-800 py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 6v6l4 2" />
                </svg>
            </div>
            <p className="text-sm text-slate-400 m-0 text-center max-w-sm">
                No scheduled tests yet. Save a test from the Query Tester and schedule it here.
            </p>
        </div>
    );
}
