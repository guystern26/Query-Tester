/**
 * ChatActionResult — renders inline result of a run_query action.
 * Small table (max 5 rows × 6 columns), truncated values.
 */
import React from 'react';
import type { ActionResult } from '../../core/store/slices/chatSlice';

const MAX_ROWS = 5;
const MAX_COLS = 6;
const MAX_CELL_LEN = 40;

interface ChatActionResultProps {
    result: ActionResult;
}

function truncate(val: string): string {
    return val.length > MAX_CELL_LEN ? val.slice(0, MAX_CELL_LEN) + '\u2026' : val;
}

export function ChatActionResult({ result }: ChatActionResultProps): React.ReactElement {
    if (result.status === 'loading') {
        return (
            <div className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400">
                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running query...
            </div>
        );
    }

    if (result.status === 'error') {
        return (
            <div className="text-[11px] text-red-400 py-1">
                Error: {result.error || 'Query failed'}
            </div>
        );
    }

    const rows = result.rows;
    if (!rows || rows.length === 0) {
        return (
            <div className="text-[11px] text-slate-500 py-1">No results returned.</div>
        );
    }

    const allKeys = Object.keys(rows[0]);
    const keys = allKeys.slice(0, MAX_COLS);
    const displayRows = rows.slice(0, MAX_ROWS);
    const truncatedCols = allKeys.length > MAX_COLS;
    const truncatedRows = rows.length > MAX_ROWS;

    return (
        <div className="mt-1.5 overflow-x-auto">
            <table className="text-[11px] border-collapse w-full">
                <thead>
                    <tr>
                        {keys.map((k) => (
                            <th
                                key={k}
                                className="text-left px-1.5 py-0.5 text-slate-400 font-medium border-b border-slate-700 whitespace-nowrap"
                            >
                                {k}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((row, i) => (
                        <tr key={i}>
                            {keys.map((k) => (
                                <td
                                    key={k}
                                    className="px-1.5 py-0.5 text-slate-300 border-b border-slate-700/50 whitespace-nowrap"
                                >
                                    {truncate(String(row[k] ?? ''))}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {(truncatedRows || truncatedCols) && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                    {truncatedRows && rows.length + ' total rows'}
                    {truncatedRows && truncatedCols && ' · '}
                    {truncatedCols && allKeys.length + ' total columns'}
                </div>
            )}
        </div>
    );
}
