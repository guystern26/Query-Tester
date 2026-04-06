/** Pagination controls for the result rows table. */
import React from 'react';

export interface ResultRowsPaginationProps {
    page: number;
    totalPages: number;
    totalRows: number;
    isTruncated: boolean;
    unfilteredCount: number;
    onPageChange: (page: number) => void;
}

export function ResultRowsPagination({
    page,
    totalPages,
    totalRows,
    isTruncated,
    unfilteredCount,
    onPageChange,
}: ResultRowsPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center gap-2 justify-between px-1">
            <span className="text-[11px] text-slate-500">
                Page {page + 1} of {totalPages} ({totalRows} row{totalRows !== 1 ? 's' : ''}
                {isTruncated ? ' of ' + unfilteredCount + ' total' : ''})
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                    className="px-2 py-0.5 text-[11px] rounded bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                    Prev
                </button>
                <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => onPageChange(page + 1)}
                    className="px-2 py-0.5 text-[11px] rounded bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
