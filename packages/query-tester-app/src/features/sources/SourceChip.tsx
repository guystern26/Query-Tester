/**
 * SourceChip — confirmed source chip in the Sources step strip.
 * Shows colored dot, row identifier, field tags, and remove button.
 */
import React from 'react';

var SOURCE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

interface SourceChipProps {
    rowIdentifier: string;
    fields: string[];
    colorIndex: number;
    onRemove: () => void;
}

export function SourceChip({ rowIdentifier, fields, colorIndex, onRemove }: SourceChipProps): React.ReactElement {
    var color = SOURCE_COLORS[colorIndex % SOURCE_COLORS.length];

    return (
        <div
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg transition-colors"
            style={{ backgroundColor: color + '15', border: '1px solid ' + color + '30' }}
        >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[12px] font-mono text-slate-200 truncate max-w-[200px]" title={rowIdentifier}>
                {rowIdentifier}
            </span>
            {fields.length > 0 && (
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                    ({fields.length} field{fields.length !== 1 ? 's' : ''})
                </span>
            )}
            <button
                type="button"
                onClick={onRemove}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-red-900/30 hover:text-red-400 cursor-pointer transition-all text-[13px] flex-shrink-0 ml-0.5"
                title="Remove this data source"
            >
                {'\u00D7'}
            </button>
        </div>
    );
}
