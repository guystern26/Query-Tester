import React from 'react';

const inputCls = [
    'flex-1 px-3 py-1.5 text-sm bg-navy-950 border border-slate-700 rounded-lg',
    'text-slate-200 placeholder-slate-500',
    'focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20',
].join(' ');

function isValidEmail(email: string): boolean {
    return email.includes('@') && email.includes('.');
}

export interface RecipientsListProps {
    recipients: string[];
    onChange: (recipients: string[]) => void;
}

export function RecipientsList({ recipients, onChange }: RecipientsListProps) {
    const handleChange = (index: number, value: string) => {
        const updated = [...recipients];
        updated[index] = value;
        onChange(updated);
    };

    const handleRemove = (index: number) => {
        onChange(recipients.filter((_, i) => i !== index));
    };

    const handleAdd = () => {
        onChange([...recipients, '']);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400">Recipients</label>

            {recipients.map((email, i) => {
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
                className="text-xs text-blue-300 hover:text-accent-200 cursor-pointer self-start mt-0.5"
            >
                + Add recipient
            </button>
        </div>
    );
}

export function hasInvalidRecipients(recipients: string[]): boolean {
    return recipients.some((r) => r.trim() !== '' && !isValidEmail(r));
}
