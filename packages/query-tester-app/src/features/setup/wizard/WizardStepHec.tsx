import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig, ConnectionTestResult } from 'core/types/config';
import { SetupField, SetupToggle } from '../SetupField';
import { useSectionFields } from '../useSectionFields';

const SCHEME_OPTIONS = [
    { value: 'http', label: 'http' },
    { value: 'https', label: 'https' },
];

const FIELD_KEYS: Array<keyof AppConfig> = [
    'hecHost', 'hecPort', 'hecScheme', 'hecSslVerify', 'hecTimeout',
];

export interface WizardStepHecProps {
    onNext: () => void;
}

export function WizardStepHec({ onNext }: WizardStepHecProps) {
    const appConfig = useTestStore((s) => s.appConfig);
    const saveConfigSection = useTestStore((s) => s.saveConfigSection);
    const testConnection = useTestStore((s) => s.testConnection);

    const { fields, setField, secrets, setSecret, isDetected, getPlainFields, getSecretFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hecToken = secrets.hecToken ?? '';
    const hasToken = hecToken.trim().length > 0;

    const handleTest = useCallback(async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            // Save first so test uses latest values
            await saveConfigSection(getPlainFields(), getSecretFields());
            const r = await testConnection();
            setTestResult(r);
        } catch (e) {
            setTestResult(null);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsTesting(false);
        }
    }, [saveConfigSection, getPlainFields, getSecretFields, testConnection]);

    const handleNext = useCallback(async () => {
        setIsSaving(true);
        setError(null);
        try {
            await saveConfigSection(getPlainFields(), getSecretFields());
            onNext();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsSaving(false);
        }
    }, [saveConfigSection, getPlainFields, getSecretFields, onNext]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1">Welcome to Query Tester</h2>
                <p className="text-sm text-slate-400">Let's configure the essentials to get you started.</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
                Query Tester needs an HTTP Event Collector (HEC) token to inject test events into Splunk.
                If you don't have one yet, create it in{' '}
                <span className="text-slate-300">Settings &rarr; Data Inputs &rarr; HTTP Event Collector</span>.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <SetupField
                    label="HEC Host" value={fields.hecHost} onChange={(v) => setField('hecHost', v)}
                    isDetected={isDetected('hecHost')} placeholder="localhost"
                />
                <SetupField
                    label="HEC Port" value={fields.hecPort} onChange={(v) => setField('hecPort', v)}
                    isDetected={isDetected('hecPort')} placeholder="8088"
                />
                <SetupField
                    label="Scheme" value={fields.hecScheme} onChange={(v) => setField('hecScheme', v)}
                    isDetected={isDetected('hecScheme')} type="select" options={SCHEME_OPTIONS}
                />
                <SetupField
                    label="Timeout (s)" value={fields.hecTimeout} onChange={(v) => setField('hecTimeout', v)}
                    isDetected={isDetected('hecTimeout')} placeholder="30"
                />
                <SetupToggle
                    label="SSL Verify"
                    checked={fields.hecSslVerify === 'true'}
                    onChange={(c) => setField('hecSslVerify', String(c))}
                    isDetected={isDetected('hecSslVerify')}
                />
                <div>
                    <label className="flex items-center text-xs font-semibold text-slate-400 mb-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" className="mr-1.5 shrink-0">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        HEC Token
                    </label>
                    <input
                        type="password"
                        value={hecToken}
                        onChange={(e) => setSecret('hecToken', e.target.value)}
                        placeholder="Enter HEC token"
                        className="w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30"
                    />
                </div>
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={!hasToken || isTesting}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && testResult.hec === 'ok' && (
                    <span className="text-xs text-green-400 font-medium">HEC connected &#10003;</span>
                )}
                {testResult && testResult.hec === 'error' && (
                    <span className="text-xs text-red-400 font-medium">
                        HEC failed: {testResult.hecDetail}
                    </span>
                )}
            </div>

            {error && (
                <div className="text-xs text-red-400">{error}</div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasToken || isSaving}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isSaving ? 'Saving...' : 'Next'}
                </button>
            </div>
        </div>
    );
}
