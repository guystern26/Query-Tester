import React, { useState, useCallback } from 'react';
import { SCHEDULE_INTERVALS } from 'core/constants/scheduledTests';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

const segBtn = 'px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer';
const segActive = 'bg-accent-600/20 text-accent-300 border border-accent-600/40';
const segInactive = 'bg-navy-950 text-slate-400 border border-slate-700 hover:text-slate-200';

export interface IntervalPickerProps {
    value: string;
    onChange: (intervalKey: string, cron: string) => void;
}

export function IntervalPicker({ value, onChange }: IntervalPickerProps): React.ReactElement {
    const [loading, setLoading] = useState(false);
    const [slot, setSlot] = useState<{ key: string; minute: number } | null>(null);

    const matched = SCHEDULE_INTERVALS.find((i) => i.key === value);
    const isLegacy = !matched && value !== '';

    const handleClick = useCallback(async (key: string) => {
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
            const minute = Number(data.minute ?? 0);
            const cron = String(data.cron ?? '');
            setSlot({ key, minute });
            onChange(key, cron);
        } catch {
            // Fallback: pick random minute client-side
            const minute = Math.floor(Math.random() * 60);
            const interval = SCHEDULE_INTERVALS.find((i) => i.key === key);
            const cron = interval ? interval.buildCron(minute) : '0 6 * * *';
            setSlot({ key, minute });
            onChange(key, cron);
        } finally {
            setLoading(false);
        }
    }, [onChange]);

    const description = isLegacy
        ? 'Custom (legacy) — select a new interval to update'
        : matched
            ? matched.description + (slot && slot.key === value ? ' — your slot: minute ' + slot.minute : '')
            : 'Select a schedule interval';

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Schedule</label>
            <div className="flex flex-wrap gap-1.5">
                {SCHEDULE_INTERVALS.map((interval) => {
                    const active = interval.key === value;
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
            </div>
            {loading && (
                <span className="text-[11px] text-blue-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Assigning time slot...
                </span>
            )}
            {!loading && (
                <span className="text-[11px] text-slate-500">{description}</span>
            )}
        </div>
    );
}
