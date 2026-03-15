/** Paginated result rows table with per-row validation. Failed rows sorted to top. */
import React, { useState, useMemo } from 'react';
import type { ValidationDetail } from 'core/types';
import { HIDDEN_SPLUNK_FIELDS, MAX_DISPLAY_ROWS, MANY_COLUMNS_THRESHOLD, PAGE_SIZE, humanizeCondition, isInjectedRunId, getRowValidation } from './resultHelpers';

export interface ResultRowsTableProps {
  rows: Record<string, unknown>[];
  hiddenColumns: Set<string>;
  onToggleColumn: (col: string) => void;
  fieldFailures: Map<string, ValidationDetail[]>;
  validations?: ValidationDetail[];
}

export function ResultRowsTable({ rows, hiddenColumns, onToggleColumn, fieldFailures, validations }: ResultRowsTableProps) {
  const [page, setPage] = useState(0);
  const hasValidations = (validations && validations.length > 0) || false;
  const fieldValidations = useMemo(
    () => (validations || []).filter((v) => !v.field.startsWith('_')),
    [validations],
  );

  const allColumns = useMemo(() => {
    const colSet = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (!k.startsWith('_') && !HIDDEN_SPLUNK_FIELDS.has(k) && !isInjectedRunId(k)) {
          colSet.add(k);
        }
      });
    });
    return Array.from(colSet);
  }, [rows]);

  const visibleColumns = allColumns.filter((c) => !hiddenColumns.has(c));
  const hideableColumns = allColumns.filter((c) => hiddenColumns.has(c));

  // Sort rows: failed first, then passed — preserving original order within each group
  const sortedRows = useMemo(() => {
    if (!hasValidations || fieldValidations.length === 0) return rows;
    const indexed = rows.map((row, i) => ({ row, origIndex: i, val: getRowValidation(row, fieldValidations) }));
    indexed.sort((a, b) => {
      if (a.val.passed === b.val.passed) return a.origIndex - b.origIndex;
      return a.val.passed ? 1 : -1; // failed first
    });
    return indexed.map((item) => item.row);
  }, [rows, hasValidations, fieldValidations]);

  const totalRows = Math.min(sortedRows.length, MAX_DISPLAY_ROWS);
  const isTruncated = sortedRows.length > MAX_DISPLAY_ROWS;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const pageRows = sortedRows.slice(page * PAGE_SIZE, Math.min((page + 1) * PAGE_SIZE, totalRows));

  if (visibleColumns.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Hidden column restore chips */}
      {hideableColumns.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[11px] text-slate-500 mr-1">Hidden:</span>
          {hideableColumns.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onToggleColumn(col)}
              className="px-1.5 py-0.5 text-[10px] rounded bg-navy-900 text-slate-500 hover:text-slate-300 hover:bg-navy-800 border border-slate-700/50 cursor-pointer transition-colors"
              title={'Show column "' + col + '"'}
            >
              {col} +
            </button>
          ))}
        </div>
      )}

      {/* Truncation warning */}
      {isTruncated && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-[12px] text-amber-300">
          <span className="font-semibold">{sortedRows.length}</span> total results returned.
          Displaying first <span className="font-semibold">{MAX_DISPLAY_ROWS}</span> rows for performance.
        </div>
      )}
      {allColumns.length > MANY_COLUMNS_THRESHOLD && (
        <div className="text-[11px] text-amber-400/80 px-1">
          This query returned {allColumns.length} fields. Consider hiding columns you don't need.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded border border-slate-700/70">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-navy-950/80">
              <th className="px-2 py-1.5 text-left text-[11px] font-medium text-slate-500 border-b border-slate-700/60 w-8">#</th>
              {visibleColumns.map((col) => {
                const hasFail = fieldFailures.has(col);
                return (
                  <th
                    key={col}
                    className={'px-2.5 py-1.5 text-left font-semibold border-b whitespace-nowrap group ' + (hasFail ? 'text-red-400/80 border-b-red-500/30' : 'text-steel-400 border-b-slate-700/60')}
                  >
                    <span className="flex items-center gap-1">
                      {col}
                      {hasFail && <span className="text-[9px] text-red-400/60" title="This field has failed validations">{'\u26a0'}</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleColumn(col); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[10px] text-slate-500 hover:text-red-400 cursor-pointer bg-transparent border-none p-0 transition-opacity"
                        title={'Hide column "' + col + '"'}
                      >
                        x
                      </button>
                    </span>
                  </th>
                );
              })}
              {hasValidations && (
                <th className="px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-500 border-b border-slate-700/60 min-w-[200px]">Validation</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const absIndex = page * PAGE_SIZE + ri;
              const rowVal = hasValidations ? getRowValidation(row, fieldValidations) : null;

              const rowBg = rowVal
                ? rowVal.passed
                  ? 'bg-green-900/15'
                  : 'bg-red-900/15'
                : absIndex % 2 === 0 ? 'bg-navy-900/30' : 'bg-transparent';

              return (
                <tr key={absIndex} className={rowBg}>
                  <td className="px-2 py-1 text-[11px] text-slate-600 border-b border-slate-700/30">{absIndex + 1}</td>
                  {visibleColumns.map((col) => {
                    const rawVal = row[col];
                    const cellVal = Array.isArray(rawVal)
                      ? rawVal.join(' ')
                      : typeof rawVal === 'string' && rawVal.includes('\n')
                        ? rawVal.replace(/\n/g, ' ')
                        : String(rawVal ?? '');
                    const hasFail = fieldFailures.has(col);
                    return (
                      <td
                        key={col}
                        className={'px-2.5 py-1 border-b border-slate-700/30 whitespace-nowrap max-w-[280px] ' + (hasFail ? 'text-red-300' : 'text-slate-300')}
                        title={cellVal}
                      >
                        <span className="truncate block">{cellVal}</span>
                      </td>
                    );
                  })}
                  {rowVal && (
                    <td className="px-2.5 py-1 border-b border-slate-700/30 align-top">
                      <div className="flex items-start gap-1.5">
                        <span className={'shrink-0 text-[11px] font-bold ' + (rowVal.passed ? 'text-green-400' : 'text-red-400')}>
                          {rowVal.passed ? '\u2713 PASS' : '\u2717 FAIL'}
                        </span>
                        {rowVal.notes.length > 0 && (
                          <span className="text-[10px] text-red-400/80 leading-tight whitespace-normal">
                            {rowVal.notes.join(' | ')}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-between px-1">
          <span className="text-[11px] text-slate-500">
            Page {page + 1} of {totalPages} ({totalRows} row{totalRows !== 1 ? 's' : ''}{isTruncated ? ' of ' + sortedRows.length + ' total' : ''})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="px-2 py-0.5 text-[11px] rounded bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="px-2 py-0.5 text-[11px] rounded bg-navy-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
