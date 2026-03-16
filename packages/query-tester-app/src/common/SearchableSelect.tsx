import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface SearchableSelectOption {
    value: string;
    label: string;
}

export interface SearchableSelectProps {
    value: string;
    options: SearchableSelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    value, options, onChange, placeholder = 'Search...', disabled,
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [focusIndex, setFocusIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Display the selected option's label when not actively searching
    const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

    const filtered = query.trim()
        ? options.filter((o) => o.value !== '' && o.label.toLowerCase().includes(query.toLowerCase()))
        : options.filter((o) => o.value !== '');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setOpen(true);
        setFocusIndex(-1);
    };

    const handleSelect = useCallback((opt: SearchableSelectOption) => {
        onChange(opt.value);
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
    }, [onChange]);

    const handleFocus = () => {
        setOpen(true);
        setQuery('');
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Don't close if clicking inside the dropdown
        if (containerRef.current?.contains(e.relatedTarget as Node)) return;
        setOpen(false);
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setOpen(true);
                e.preventDefault();
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < filtered.length) {
            e.preventDefault();
            handleSelect(filtered[focusIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
            inputRef.current?.blur();
        }
    };

    // Scroll focused item into view
    useEffect(() => {
        if (focusIndex >= 0 && listRef.current) {
            const item = listRef.current.children[focusIndex] as HTMLElement;
            if (item) item.scrollIntoView({ block: 'nearest' });
        }
    }, [focusIndex]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative" onBlur={handleBlur}>
            <input
                ref={inputRef}
                type="text"
                value={open ? query : selectedLabel}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {/* Chevron */}
            <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {open && (
                <ul
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-navy-950 border border-slate-700 rounded-lg shadow-xl"
                >
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
                    ) : (
                        filtered.map((opt, i) => (
                            <li
                                key={opt.value}
                                tabIndex={-1}
                                onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                                className={'px-3 py-1.5 text-sm cursor-pointer transition-colors '
                                    + (i === focusIndex
                                        ? 'bg-accent-600/20 text-accent-300'
                                        : opt.value === value
                                            ? 'text-slate-200 bg-navy-800'
                                            : 'text-slate-300 hover:bg-navy-800')}
                            >
                                {opt.label}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
