import React from 'react';

const INPUT_CLS = 'w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20';

interface AutoDetectBadgeProps {
    isDetected: boolean;
}

function AutoDetectBadge({ isDetected }: AutoDetectBadgeProps) {
    if (!isDetected) return null;
    return (
        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-400 rounded">
            &#9889; Auto-detected
        </span>
    );
}

export interface SetupFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    isDetected?: boolean;
    placeholder?: string;
    type?: 'text' | 'select';
    options?: Array<{ value: string; label: string }>;
    fullWidth?: boolean;
    disabled?: boolean;
}

export function SetupField({
    label,
    value,
    onChange,
    isDetected = false,
    placeholder,
    type = 'text',
    options,
    fullWidth = false,
    disabled = false,
}: SetupFieldProps) {
    return (
        <div className={fullWidth ? 'col-span-2' : ''}>
            <label className="flex items-center text-xs font-semibold text-slate-400 mb-1.5">
                {label}
                <AutoDetectBadge isDetected={isDetected} />
            </label>
            {type === 'select' && options ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={INPUT_CLS + ' cursor-pointer'}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={INPUT_CLS}
                />
            )}
        </div>
    );
}

export interface SetupToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    isDetected?: boolean;
}

export function SetupToggle({ label, checked, onChange, isDetected = false }: SetupToggleProps) {
    return (
        <div>
            <label className="flex items-center text-xs font-semibold text-slate-400 mb-1.5">
                {label}
                <AutoDetectBadge isDetected={isDetected} />
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only"
                />
                <span className={'relative w-10 h-[22px] rounded-full transition-colors duration-200 ' + (checked ? 'bg-blue-300' : 'bg-slate-600')}>
                    <span className={'absolute top-[2px] w-[18px] h-[18px] rounded-full bg-slate-100 shadow transition-[left] duration-200 ' + (checked ? 'left-5' : 'left-[2px]')} />
                </span>
                <span className="text-sm text-slate-200">{checked ? 'Enabled' : 'Disabled'}</span>
            </label>
        </div>
    );
}
