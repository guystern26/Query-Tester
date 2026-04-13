import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';

export interface SetupSectionProps {
    title: string;
    note?: string;
    children: React.ReactNode;
    getPlainFields: () => Partial<AppConfig>;
    getSecretFields?: () => Record<string, string>;
    headerAction?: React.ReactNode;
}

export function SetupSection({
    title,
    note,
    children,
    getPlainFields,
    getSecretFields,
    headerAction,
}: SetupSectionProps) {
    const saveConfigSection = useTestStore((s) => s.saveConfigSection);
    const isLoading = useTestStore((s) => s.isLoadingConfig);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<number>(0);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const handleSave = useCallback(async () => {
        setError(null);
        setSaved(false);
        try {
            const plain = getPlainFields();
            const secrets = getSecretFields ? getSecretFields() : undefined;
            await saveConfigSection(plain, secrets);
            setSaved(true);
            timerRef.current = window.setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, [saveConfigSection, getPlainFields, getSecretFields]);

    return (
        <section className="border border-slate-700 rounded-lg bg-navy-900 p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
                <div className="flex items-center gap-3">
                    {headerAction}
                    {saved && (
                        <span className="text-xs text-green-400 font-medium">Saved &#10003;</span>
                    )}
                    {error && (
                        <span className="text-xs text-red-400 font-medium">{error}</span>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-300 hover:bg-blue-200 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Save
                    </button>
                </div>
            </div>
            {note && <p className="text-xs text-slate-400 mb-4">{note}</p>}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
        </section>
    );
}
