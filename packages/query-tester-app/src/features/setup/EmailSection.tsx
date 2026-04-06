import React, { useState, useCallback, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig, EmailAuthMethod } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { useSectionFields } from './useSectionFields';
import { EmailAuthFields } from './EmailAuthFields';

const FIELD_KEYS: Array<keyof AppConfig> = [
    'emailAuthMethod', 'smtpServer', 'smtpPort', 'mailFrom', 'mailTo',
    'defaultAlertEmail', 'smtpUsername', 'oauthTenantId', 'oauthClientId',
    'emailProvider', 'emailApiEndpoint',
];

const AUTH_TABS: Array<{ id: EmailAuthMethod; label: string }> = [
    { id: 'none', label: 'No Auth' },
    { id: 'password', label: 'Password' },
    { id: 'oauth2', label: 'OAuth2' },
    { id: 'apikey', label: 'API Key' },
];

export function EmailSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const detectEmailConfig = useTestStore((s) => s.detectEmailConfig);
    const sectionState = useSectionFields(appConfig, FIELD_KEYS);
    const { fields, setField } = sectionState;
    const [importBanner, setImportBanner] = useState<string | null>(null);

    const authMethod = (fields.emailAuthMethod || 'none') as EmailAuthMethod;

    const handleImport = useCallback(async () => {
        try {
            const result = await detectEmailConfig();
            if (result.source === 'splunk_native') {
                if (result.smtpServer) setField('smtpServer', result.smtpServer);
                if (result.smtpPort) setField('smtpPort', result.smtpPort);
                if (result.mailFrom) setField('mailFrom', result.mailFrom);
                if (result.smtpUsername) setField('smtpUsername', result.smtpUsername);
                if (result.emailAuthMethod) setField('emailAuthMethod', result.emailAuthMethod);
                setImportBanner('Email settings imported from Splunk\u2019s existing alert configuration. Review and save to confirm.');
            } else {
                setImportBanner('No existing Splunk email configuration found.');
            }
        } catch {
            setImportBanner('Failed to detect email configuration.');
        }
    }, [detectEmailConfig, setField]);

    const importButton = (
        <button
            type="button"
            onClick={handleImport}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:border-accent-600 hover:text-accent-300 cursor-pointer"
        >
            Import from Splunk
        </button>
    );

    return (
        <SetupSection
            title="Email / SMTP"
            getPlainFields={sectionState.getPlainFields}
            getSecretFields={() => sectionState.getSecretFields()}
            headerAction={importButton}
        >
            {importBanner && (
                <div className="col-span-2 px-3 py-2 rounded-md border-l-4 border-amber-500 bg-amber-500/10 text-xs text-amber-300 flex items-center justify-between">
                    <span>{importBanner}</span>
                    <button type="button" onClick={() => setImportBanner(null)} className="text-slate-400 hover:text-slate-200 ml-2 cursor-pointer">&times;</button>
                </div>
            )}
            <div className="col-span-2 flex gap-1 border-b border-slate-800 mb-2">
                {AUTH_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setField('emailAuthMethod', tab.id)}
                        className={'px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer ' + (authMethod === tab.id ? 'text-accent-400 border-accent-600' : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <EmailAuthFields method={authMethod} state={sectionState} />
        </SetupSection>
    );
}
