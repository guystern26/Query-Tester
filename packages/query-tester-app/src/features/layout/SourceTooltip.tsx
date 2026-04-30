/**
 * SourceTooltip — floating tooltip for data source spans in the sidebar.
 */
import React from 'react';

interface SourceTooltipProps {
    visible: boolean;
    x: number;
    y: number;
    isUsed: boolean;
    rowIdentifier: string;
    fields: string[];
    isFallback: boolean;
}

export function SourceTooltip({
    visible,
    x,
    y,
    isUsed,
    rowIdentifier,
    fields,
    isFallback,
}: SourceTooltipProps): React.ReactElement | null {
    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: x + 12,
                top: y - 8,
                zIndex: 1000,
                maxWidth: 280,
                pointerEvents: 'none',
            }}
            className="px-2.5 py-2 rounded-lg bg-navy-800 border border-slate-600 shadow-lg shadow-black/40 text-[11px] leading-snug"
        >
            {isUsed ? (
                <div>
                    <div className="text-slate-400 font-medium mb-0.5">Already configured</div>
                    <div className="text-slate-500">This source is already used in this scenario</div>
                </div>
            ) : (
                <div>
                    <div className="text-blue-300 font-medium mb-0.5">
                        Click to inject test data here
                    </div>
                    {fields.length > 0 && (
                        <div className="text-slate-400 mt-1">
                            Fields: {fields.slice(0, 6).join(', ')}
                            {fields.length > 6 ? ' +' + (fields.length - 6) + ' more' : ''}
                        </div>
                    )}
                    {isFallback && (
                        <div className="text-slate-500 mt-0.5 italic">
                            Detected from SPL pattern
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
