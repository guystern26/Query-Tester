import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';

const INPUT_CLS = 'w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20';

export interface SecretFieldProps {
    label: string;
    secretKey: string;
    isSet: boolean;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SecretField({
    label,
    secretKey,
    isSet,
    value,
    onChange,
    placeholder = 'not configured',
}: SecretFieldProps) {
    const getSecret = useTestStore((s) => s.getSecret);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [revealedValue, setRevealedValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReveal = useCallback(async () => {
        if (isRevealed) {
            setRevealedValue('');
            setIsRevealed(false);
            return;
        }
        setIsLoading(true);
        try {
            const val = await getSecret(secretKey);
            setRevealedValue(val);
            setIsRevealed(true);
        } finally {
            setIsLoading(false);
        }
    }, [isRevealed, getSecret, secretKey]);

    const handleEdit = useCallback(() => {
        setIsRevealed(false);
        setRevealedValue('');
        setIsEditing(true);
    }, []);

    const hasNewValue = value.length > 0;
    const showMasked = isSet && !hasNewValue && !isRevealed && !isEditing;

    return (
        <div>
            <label className="flex items-center text-xs font-semibold text-slate-400 mb-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" className="mr-1.5 shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {label}
            </label>
            <div className="relative">
                {showMasked ? (
                    <div className="flex items-center gap-2">
                        <div className={INPUT_CLS + ' flex-1 text-slate-500 select-none'}>
                            &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
                        </div>
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="px-2 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Change"
                        >
                            <PencilIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleReveal}
                            disabled={isLoading}
                            className="px-2 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Reveal"
                        >
                            <EyeIcon />
                        </button>
                    </div>
                ) : isRevealed ? (
                    <div className="flex items-center gap-2">
                        <div className={INPUT_CLS + ' flex-1 text-slate-200 font-mono text-xs'}>
                            {revealedValue}
                        </div>
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="px-2 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Change"
                        >
                            <PencilIcon />
                        </button>
                        <button
                            type="button"
                            onClick={handleReveal}
                            className="px-2 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Hide"
                        >
                            <EyeOffIcon />
                        </button>
                    </div>
                ) : (
                    <input
                        type="password"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={INPUT_CLS}
                    />
                )}
            </div>
        </div>
    );
}

function EyeIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function PencilIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}
