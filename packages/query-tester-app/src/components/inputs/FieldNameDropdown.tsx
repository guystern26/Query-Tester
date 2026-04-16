import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

export interface FieldNameDropdownProps {
    value: string;
    onChange: (v: string) => void;
    usedFields: string[];
    rowIdentifier: string;
}

export function FieldNameDropdown({
    value,
    onChange,
    usedFields,
    rowIdentifier,
}: FieldNameDropdownProps): React.ReactElement {
    const test = useTestStore(selectActiveTest);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Only show fields from the source matching this input's rowIdentifier
    const matchingSource = test?.fieldExtraction?.sources.find(
        (s) => s.rowIdentifier === rowIdentifier
    );
    const extracted = matchingSource?.fields || [];
    const available = Array.from(new Set(extracted)).filter(
        (f) => f !== value && !usedFields.includes(f)
    );
    // Chevron only shows when a rowIdentifier is selected AND there are suggestions
    const hasSource = rowIdentifier.trim().length > 0;
    const hasSuggestions = hasSource && available.length > 0;

    const handlePick = useCallback(
        (f: string) => {
            onChange(f);
            setOpen(false);
        },
        [onChange]
    );

    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    return (
        <div ref={wrapRef} className="flex flex-col">
            <div className="flex items-center">
                <input
                    className={`w-28 px-2 py-1.5 text-sm font-semibold bg-transparent border-0 border-b-2 border-slate-700/50 text-blue-300 placeholder-slate-600 focus:outline-none focus:border-blue-300 transition-colors duration-200 ${hasSuggestions ? 'pr-5' : ''}`}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="field name"
                />
                {hasSuggestions && (
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="text-slate-500 hover:text-blue-300 cursor-pointer transition-colors duration-200 -ml-5 flex-shrink-0"
                        aria-label="Show field suggestions"
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                )}
            </div>
            {/* Inline expansion — pushes row down, no overlay clipping */}
            {open && hasSuggestions && (
                <div className="flex flex-wrap gap-1 pt-1.5 pb-0.5 max-w-[200px] max-h-[88px] overflow-y-auto">
                    {available.map((f) => (
                        <button
                            key={f}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handlePick(f);
                            }}
                            className="px-2 py-0.5 text-[11px] text-slate-300 bg-navy-700/60 border border-slate-600/40 rounded-md hover:bg-navy-700 hover:text-blue-300 hover:border-blue-300/30 cursor-pointer transition-all duration-150 whitespace-nowrap"
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
