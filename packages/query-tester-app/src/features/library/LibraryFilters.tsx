import React from 'react';

const inputStyle = [
    'px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg',
    'text-slate-200 placeholder-slate-500',
    'focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20',
    'transition-all duration-200',
].join(' ');

const selectStyle = inputStyle + ' cursor-pointer';

export interface LibraryFiltersProps {
    search: string;
    onSearchChange: (v: string) => void;
    appFilter: string;
    onAppFilterChange: (v: string) => void;
    apps: string[];
    typeFilter: string;
    onTypeFilterChange: (v: string) => void;
    creatorFilter: string;
    onCreatorFilterChange: (v: string) => void;
    creators: string[];
    savedSearchFilter: string;
    onSavedSearchFilterChange: (v: string) => void;
    savedSearches: string[];
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
}

const TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    { value: 'standard', label: 'Standard' },
    { value: 'ijump_alert', label: 'iJump' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'pass', label: 'Passed' },
    { value: 'fail', label: 'Failed' },
    { value: 'error', label: 'Error' },
    { value: 'no_runs', label: 'Not run yet' },
];

export function LibraryFilters({
    search, onSearchChange,
    appFilter, onAppFilterChange, apps,
    typeFilter, onTypeFilterChange,
    creatorFilter, onCreatorFilterChange, creators,
    savedSearchFilter, onSavedSearchFilterChange, savedSearches,
    statusFilter, onStatusFilterChange,
}: LibraryFiltersProps) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search tests..."
                    className={inputStyle + ' pl-9 w-full'}
                />
            </div>

            <select
                value={appFilter}
                onChange={(e) => onAppFilterChange(e.target.value)}
                className={selectStyle}
            >
                <option value="">All apps</option>
                {apps.map((a) => (
                    <option key={a} value={a}>{a}</option>
                ))}
            </select>

            <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value)}
                className={selectStyle}
            >
                {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>

            <select
                value={creatorFilter}
                onChange={(e) => onCreatorFilterChange(e.target.value)}
                className={selectStyle}
            >
                <option value="">All creators</option>
                {creators.map((c) => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>

            <select
                value={savedSearchFilter}
                onChange={(e) => onSavedSearchFilterChange(e.target.value)}
                className={selectStyle}
            >
                <option value="">All saved searches</option>
                {savedSearches.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className={selectStyle}
            >
                {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
