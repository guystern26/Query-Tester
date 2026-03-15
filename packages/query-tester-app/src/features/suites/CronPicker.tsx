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

export function CronPicker({ value, onChange }: CronPickerProps) {
    const isPreset = CRON_PRESETS.some((p) => p.value !== '' && p.value === value);
    const isCustom = !isPreset;

    const handlePresetClick = (preset: { label: string; value: string }) => {
        if (preset.value === '') {
            // Custom — keep current value if already custom, else clear
            if (isPreset) onChange('');
        } else {
            onChange(preset.value);
        }
    };

    const description = isCustom
        ? (value.trim() ? 'Custom cron: ' + value : 'Enter a cron expression')
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
            <span className="text-[11px] text-slate-500">{description}</span>
        </div>
    );
}
