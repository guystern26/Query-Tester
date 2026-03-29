/**
 * IdeResultsTable — renders IDE query result rows as a clean, readable table.
 * Shows column headers from row keys. Internal Splunk fields are hidden.
 */
import React, { useState } from 'react';

const IDE_PAGE_SIZE = 7;

interface IdeResultsTableProps {
    rows: Record<string, string>[];
    totalCount: number;
}

/** Fields to suppress from the results table (Splunk internal). */
const HIDDEN_FIELDS = new Set([
    '_bkt', '_cd', '_si', '_indextime', '_serial', '_sourcetype', '_subsecond',
]);

export function IdeResultsTable({ rows, totalCount }: IdeResultsTableProps): React.ReactElement {
    const [page, setPage] = useState(0);

    if (rows.length === 0) {
        return <div className="py-6 text-center text-slate-500 text-[13px]">Query returned 0 results.</div>;
    }

    const colSet = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!HIDDEN_FIELDS.has(key)) colSet.add(key);
        }
    }
    const columns = Array.from(colSet);
    const totalPages = Math.ceil(rows.length / IDE_PAGE_SIZE);
    const pageRows = rows.slice(page * IDE_PAGE_SIZE, (page + 1) * IDE_PAGE_SIZE);
    const startIdx = page * IDE_PAGE_SIZE;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-[13px] font-semibold text-slate-300">Results</span>
                <span className="text-[12px] text-slate-500">
                    {totalCount > rows.length
                        ? `Showing ${rows.length} of ${totalCount.toLocaleString()}`
                        : `${totalCount} row${totalCount !== 1 ? 's' : ''}`}
                </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-[12px] border-collapse">
                    <thead>
                        <tr>
                            <th className="px-3 py-2 text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-600 bg-navy-800 sticky top-0 w-10">#</th>
                            {columns.map((col) => (
                                <th key={col} className="px-3 py-2 text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-600 bg-navy-800 whitespace-nowrap sticky top-0">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, i) => (
                            <tr key={startIdx + i} className="hover:bg-navy-800/50 transition-colors">
                                <td className="px-3 py-1.5 text-slate-500 border-b border-slate-800/50 tabular-nums">{startIdx + i + 1}</td>
                                {columns.map((col) => (
                                    <td key={col} className="px-3 py-1.5 text-slate-200 border-b border-slate-800/50 max-w-[400px] truncate" title={String(row[col] ?? '')}>{row[col] ?? ''}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-1">
                    <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                        className="px-2.5 py-1 text-[12px] rounded bg-navy-800 border border-slate-700 text-slate-300 hover:bg-navy-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        Prev
                    </button>
                    <span className="text-[12px] text-slate-400 tabular-nums">Page {page + 1} of {totalPages}</span>
                    <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                        className="px-2.5 py-1 text-[12px] rounded bg-navy-800 border border-slate-700 text-slate-300 hover:bg-navy-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
