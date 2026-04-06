import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig, EmailAuthMethod } from 'core/types/config';
import { useSectionFields } from '../useSectionFields';
import { EmailAuthFields } from '../EmailAuthFields';

const AUTH_TABS: Array<{ id: EmailAuthMethod; label: string }> = [
    { id: 'none', label: 'No Auth' },
    { id: 'password', label: 'Password' },
    { id: 'oauth2', label: 'OAuth2' },
    { id: 'apikey', label: 'API Key' },
];

const FIELD_KEYS: Array<keyof AppConfig> = [
    'emailAuthMethod', 'smtpServer', 'smtpPort', 'mailFrom', 'mailTo',
    'defaultAlertEmail', 'smtpUsername', 'oauthTenantId', 'oauthClientId',
    'emailProvider', 'emailApiEndpoint',
];

export interface WizardStepEmailProps {
    onNext: () => void;
    onSkip: () => void;
}

export function WizardStepEmail({ onNext, onSkip }: WizardStepEmailProps) {
    const appConfig = useTestStore((s) => s.appConfig);
    const saveConfigSection = useTestStore((s) => s.saveConfigSection);
    const detectEmailConfig = useTestStore((s) => s.detectEmailConfig);
    const sectionState = useSectionFields(appConfig, FIELD_KEYS);
    const { fields, setField } = sectionState;

    const authMethod = (fields.emailAuthMethod || 'none') as EmailAuthMethod;
    const [importBanner, setImportBanner] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImport = useCallback(async () => {
        try {
            const result = await detectEmailConfig();
            if (result.source === 'splunk_native') {
                if (result.smtpServer) setField('smtpServer', result.smtpServer);
                if (result.smtpPort) setField('smtpPort', result.smtpPort);
                if (result.mailFrom) setField('mailFrom', result.mailFrom);
                if (result.smtpUsername) setField('smtpUsername', result.smtpUsername);
                if (result.emailAuthMethod) setField('emailAuthMethod', result.emailAuthMethod);
                setImportBanner('Email settings imported from Splunk. Review and continue.');
            } else {
                setImportBanner('No existing Splunk email configuration found.');
            }
        } catch {
            setImportBanner('Failed to detect email configuration.');
        }
    }, [detectEmailConfig, setField]);

    const hasSomeConfig = Boolean(fields.smtpServer?.trim());

    const handleNext = useCallback(async () => {
        if (!hasSomeConfig) {
            onSkip();
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            await saveConfigSection(
                sectionState.getPlainFields(),
                sectionState.getSecretFields(),
            );
            onNext();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsSaving(false);
        }
    }, [hasSomeConfig, saveConfigSection, sectionState, onNext, onSkip]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1">Email Notifications</h2>
                <p className="text-sm text-slate-400">
                    Configure SMTP to receive alerts when scheduled tests fail.
                    You can skip this and set it up later.
                </p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleImport}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400 cursor-pointer"
                >
                    Import from Splunk
                </button>
                {importBanner && (
                    <span className="text-xs text-amber-400">{importBanner}</span>
                )}
            </div>

            <div className="flex gap-1 border-b border-slate-800 mb-1">
                {AUTH_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setField('emailAuthMethod', tab.id)}
                        className={'px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer ' +
                            (authMethod === tab.id
                                ? 'text-blue-400 border-blue-500'
                                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <EmailAuthFields method={authMethod} state={sectionState} />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={onSkip}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                    Skip for now &rarr;
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isSaving ? 'Saving...' : 'Next'}
                </button>
            </div>
        </div>
    );
}
