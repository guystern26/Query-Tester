import React from 'react';
import { DEFAULT_ALERT_EMAIL } from 'core/constants/scheduledTests';

const inputCls = [
    'flex-1 px-3 py-1.5 text-sm bg-navy-950 border border-slate-700 rounded-lg',
    'text-slate-200 placeholder-slate-500',
    'focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30',
].join(' ');

function isValidEmail(email: string): boolean {
    return email.includes('@') && email.includes('.');
}

export interface RecipientsListProps {
    recipients: string[];
    onChange: (recipients: string[]) => void;
}

export function RecipientsList({ recipients, onChange }: RecipientsListProps) {
    const extra = recipients.filter((r) => r !== DEFAULT_ALERT_EMAIL);

    const handleChange = (index: number, value: string) => {
        const updated = [...extra];
        updated[index] = value;
        onChange([DEFAULT_ALERT_EMAIL, ...updated]);
    };

    const handleRemove = (index: number) => {
        const updated = extra.filter((_, i) => i !== index);
        onChange([DEFAULT_ALERT_EMAIL, ...updated]);
    };

    const handleAdd = () => {
        onChange([DEFAULT_ALERT_EMAIL, ...extra, '']);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Recipients</label>

            {/* Default — locked */}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-1.5 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-400">
                    <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    {DEFAULT_ALERT_EMAIL}
                </div>
                <div className="w-7" />
            </div>

            {/* Extra recipients */}
            {extra.map((email, i) => {
                const invalid = email.trim() !== '' && !isValidEmail(email);
                return (
                    <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => handleChange(i, e.target.value)}
                                placeholder="user@example.com"
                                className={inputCls + (invalid ? ' border-red-500' : '')}
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(i)}
                                className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-navy-800 transition cursor-pointer"
                                title="Remove"
                            >
                                &times;
                            </button>
                        </div>
                        {invalid && (
                            <span className="text-[10px] text-red-400 pl-1">Invalid email address</span>
                        )}
                    </div>
                );
            })}

            <button
                type="button"
                onClick={handleAdd}
                className="text-xs text-accent-300 hover:text-accent-200 cursor-pointer self-start mt-0.5"
            >
                + Add recipient
            </button>
        </div>
    );
}

export function hasInvalidRecipients(recipients: string[]): boolean {
    return recipients.some((r) => r !== DEFAULT_ALERT_EMAIL && r.trim() !== '' && !isValidEmail(r));
}
