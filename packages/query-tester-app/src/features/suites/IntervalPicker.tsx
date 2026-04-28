import React, { useState, useCallback } from 'react';
import { SCHEDULE_INTERVALS } from 'core/constants/scheduledTests';
import { isValidCron } from './cronUtils';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

const segBtn = 'px-3 py-1.5 text-xs font-medium rounded transition-colors duration-300 cursor-pointer';
const segActive = 'bg-navy-700 text-white border-2 border-slate-600';
const segInactive = 'bg-navy-950 text-slate-600 border border-slate-700 hover:text-slate-400';

export interface IntervalPickerProps {
    value: string;
    cronValue?: string;
    onChange: (intervalKey: string, cron: string) => void;
}

export function IntervalPicker({ value, cronValue, onChange }: IntervalPickerProps): React.ReactElement {
    const [loading, setLoading] = useState(false);
    const [slot, setSlot] = useState<{ key: string; minute: number } | null>(null);
    const [customMode, setCustomMode] = useState(false);
    const [customCron, setCustomCron] = useState(cronValue || '');

    const matched = SCHEDULE_INTERVALS.find((i) => i.key === value);

    const handleClick = useCallback(async (key: string) => {
        setCustomMode(false);
        setLoading(true);
        try {
            const url = createRESTURL('data/scheduled_tests', REST_OPTS)
                + '?output_mode=json&action=suggest_minute&interval_key=' + encodeURIComponent(key);
            const defaults = getDefaultFetchInit();
            const res = await fetch(url, {
                method: 'GET',
                credentials: defaults.credentials as RequestCredentials,
                headers: defaults.headers as Record<string, string>,
            });
            if (!res.ok) throw new Error('Failed to get time slot');
            const data = await res.json();
            const minute = Number(data.minute || 0);
            const cron = String(data.cron || '');
            setSlot({ key, minute });
            onChange(key, cron);
        } catch {
            const minute = Math.floor(Math.random() * 60);
            const interval = SCHEDULE_INTERVALS.find((i) => i.key === key);
            const cron = interval ? interval.buildCron(minute) : '0 6 * * *';
            setSlot({ key, minute });
            onChange(key, cron);
        } finally {
            setLoading(false);
        }
    }, [onChange]);

    const handleCustomToggle = useCallback(() => {
        setCustomMode(true);
        setCustomCron(cronValue || '');
    }, [cronValue]);

    const handleCustomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomCron(val);
        if (isValidCron(val)) {
            onChange('custom', val);
        }
    }, [onChange]);

    const description = customMode
        ? (isValidCron(customCron) ? 'Valid cron expression' : 'Enter a valid 5-field cron (minute hour day month weekday)')
        : matched
            ? matched.description + (slot && slot.key === value ? ' — slot: min ' + slot.minute : '')
            : value === 'custom'
                ? 'Custom schedule'
                : value
                    ? 'Custom — select a preset or enter a cron'
                    : 'Select a schedule';

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Schedule</label>
            <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_INTERVALS.map((interval) => {
                    const active = interval.key === value && !customMode;
                    return (
                        <button
                            key={interval.key}
                            type="button"
                            disabled={loading}
                            className={segBtn + ' ' + (active ? segActive : segInactive) + (loading ? ' opacity-50' : '')}
                            onClick={() => handleClick(interval.key)}
                        >
                            {interval.label}
                        </button>
                    );
                })}
                <button
                    type="button"
                    disabled={loading}
                    className={segBtn + ' ' + (customMode || (value === 'custom') ? segActive : segInactive)}
                    onClick={handleCustomToggle}
                >
                    Custom
                </button>
            </div>
            {customMode && (
                <input
                    type="text"
                    value={customCron}
                    onChange={handleCustomChange}
                    placeholder="e.g. */30 * * * *  or  0 8,20 * * 1-5"
                    className="px-3 py-1.5 text-sm font-mono bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-300 transition-colors"
                />
            )}
            {loading && (
                <span className="text-[11px] text-blue-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Assigning time slot...
                </span>
            )}
            {!loading && (
                <span className={`text-[11px] ${customMode && !isValidCron(customCron) ? 'text-amber-400' : 'text-slate-500'}`}>
                    {description}
                </span>
            )}
        </div>
    );
}
