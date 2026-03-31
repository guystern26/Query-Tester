import React from 'react';
import { CRON_PRESETS } from 'core/constants/scheduledTests';

const DESCRIPTIONS: Record<string, string> = {
    '0 6 * * *': 'Runs daily at 06:00',
    '0 0 * * *': 'Runs daily at midnight',
    '0 * * * *': 'Runs every hour at :00',
    '0 */6 * * *': 'Runs every 6 hours',
};

const segBtn = 'px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer';
const segActive = 'bg-accent-600/20 text-accent-300 border border-accent-600/40';
const segInactive = 'bg-navy-950 text-slate-400 border border-slate-700 hover:text-slate-200';

export interface CronPickerProps {
    value: string;
    onChange: (cron: string) => void;
}

// Validate a single cron field (e.g. *, 5, 1-10, star/5, 1,3,5).
function validateField(field: string, min: number, max: number): string | null {
    if (field === '*') return null;

    // Step on wildcard: */N
    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2), 10);
        if (isNaN(step) || step < 1 || step > max) return 'invalid step "' + field + '"';
        return null;
    }

    // Comma-separated list: 1,3,5
    const parts = field.split(',');
    for (const part of parts) {
        // Range with optional step: 1-5 or 1-5/2
        if (part.includes('-')) {
            const [rangePart, stepPart] = part.split('/');
            const [startStr, endStr] = rangePart.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (isNaN(start) || isNaN(end)) return '"' + part + '" is not a valid range';
            if (start < min || start > max) return start + ' is out of range (' + min + '-' + max + ')';
            if (end < min || end > max) return end + ' is out of range (' + min + '-' + max + ')';
            if (start > end) return 'range start (' + start + ') > end (' + end + ')';
            if (stepPart !== undefined) {
                const step = parseInt(stepPart, 10);
                if (isNaN(step) || step < 1) return 'invalid step in "' + part + '"';
            }
        } else {
            const num = parseInt(part, 10);
            if (isNaN(num)) return '"' + part + '" is not a number';
            if (num < min || num > max) return num + ' is out of range (' + min + '-' + max + ')';
        }
    }
    return null;
}

const FIELD_NAMES = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];
const FIELD_RANGES: Array<[number, number]> = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];

export function isValidCron(expr: string): boolean {
    return getCronError(expr) === null;
}

/** Returns null if valid, or a human-readable error string. */
export function getCronError(expr: string): string | null {
    const trimmed = expr.trim();
    if (!trimmed) return null; // empty is handled separately
    const parts = trimmed.split(/\s+/);
    if (parts.length !== 5) {
        return 'Must have exactly 5 fields separated by spaces (minute hour day month weekday)';
    }
    // Block every-minute schedules — too aggressive for test runs
    if (parts[0] === '*' && parts[1] === '*') {
        return 'Schedule runs too frequently (every minute). Use at least a 5-minute interval (e.g. */5 * * * *)';
    }
    for (let i = 0; i < 5; i++) {
        if (!/^[0-9*,/\-]+$/.test(parts[i])) {
            return FIELD_NAMES[i] + ': "' + parts[i] + '" contains invalid characters';
        }
        const err = validateField(parts[i], FIELD_RANGES[i][0], FIELD_RANGES[i][1]);
        if (err) return FIELD_NAMES[i] + ': ' + err;
    }
    return null;
}

export function CronPicker({ value, onChange }: CronPickerProps) {
    const isPreset = CRON_PRESETS.some((p) => p.value !== '' && p.value === value);
    const isCustom = !isPreset;
    const cronError = isCustom && value.trim() !== '' ? getCronError(value) : null;

    const handlePresetClick = (preset: { label: string; value: string }) => {
        if (preset.value === '') {
            // Custom — keep current value if already custom, else clear
            if (isPreset) onChange('');
        } else {
            onChange(preset.value);
        }
    };

    const description = isCustom
        ? (cronError || (value.trim() ? 'Custom cron: ' + value : 'Enter a cron expression'))
        : (DESCRIPTIONS[value] || value);

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Schedule</label>
            <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map((p) => {
                    const active = p.value === '' ? isCustom : p.value === value;
                    return (
                        <button
                            key={p.label}
                            type="button"
                            className={segBtn + ' ' + (active ? segActive : segInactive)}
                            onClick={() => handlePresetClick(p)}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>
            {isCustom && (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="*/5 * * * *"
                    className="px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 font-mono"
                />
            )}
            <span className={'text-[11px] ' + (cronError ? 'text-red-400' : 'text-slate-500')}>{description}</span>
        </div>
    );
}
