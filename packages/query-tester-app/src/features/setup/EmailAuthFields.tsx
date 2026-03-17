import React from 'react';
import { SetupField } from './SetupField';
import { SecretField } from './SecretField';
import type { EmailAuthMethod } from 'core/types/config';

interface FieldState {
    fields: Record<string, string>;
    setField: (key: string, value: string) => void;
    secrets: Record<string, string>;
    setSecret: (key: string, value: string) => void;
    isDetected: (key: string) => boolean;
    isSecretSet: (key: string) => boolean;
}

export interface EmailAuthFieldsProps {
    method: EmailAuthMethod;
    state: FieldState;
}

const PROVIDER_OPTIONS = [
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'other', label: 'Other' },
];

export function EmailAuthFields({ method, state }: EmailAuthFieldsProps) {
    const { fields, setField, secrets, setSecret, isDetected, isSecretSet } = state;

    return (
        <>
            {method === 'none' && (
                <>
                    <SetupField label="SMTP Server" value={fields.smtpServer} onChange={(v) => setField('smtpServer', v)} isDetected={isDetected('smtpServer')} />
                    <SetupField label="SMTP Port" value={fields.smtpPort} onChange={(v) => setField('smtpPort', v)} isDetected={isDetected('smtpPort')} placeholder="25" />
                    <p className="col-span-2 text-xs text-slate-500">For internal corporate relays that don't require authentication.</p>
                </>
            )}
            {method === 'password' && (
                <>
                    <SetupField label="SMTP Server" value={fields.smtpServer} onChange={(v) => setField('smtpServer', v)} isDetected={isDetected('smtpServer')} />
                    <SetupField label="SMTP Port" value={fields.smtpPort} onChange={(v) => setField('smtpPort', v)} isDetected={isDetected('smtpPort')} placeholder="587" />
                    <SetupField label="Username" value={fields.smtpUsername} onChange={(v) => setField('smtpUsername', v)} isDetected={isDetected('smtpUsername')} />
                    <SecretField label="SMTP Password" secretKey="smtpPassword" isSet={isSecretSet('smtpPassword')} value={secrets.smtpPassword ?? ''} onChange={(v) => setSecret('smtpPassword', v)} />
                </>
            )}
            {method === 'oauth2' && (
                <>
                    <SetupField label="SMTP Server" value={fields.smtpServer} onChange={(v) => setField('smtpServer', v)} placeholder="smtp.office365.com" />
                    <SetupField label="SMTP Port" value={fields.smtpPort} onChange={(v) => setField('smtpPort', v)} placeholder="587" />
                    <SetupField label="Tenant ID" value={fields.oauthTenantId} onChange={(v) => setField('oauthTenantId', v)} />
                    <SetupField label="Client ID" value={fields.oauthClientId} onChange={(v) => setField('oauthClientId', v)} />
                    <SecretField label="Client Secret" secretKey="oauthClientSecret" isSet={isSecretSet('oauthClientSecret')} value={secrets.oauthClientSecret ?? ''} onChange={(v) => setSecret('oauthClientSecret', v)} />
                    <p className="col-span-2 text-xs text-slate-500">Requires an Azure app registration with SMTP.Send permission.</p>
                </>
            )}
            {method === 'apikey' && (
                <>
                    <SetupField label="Provider" value={fields.emailProvider} onChange={(v) => setField('emailProvider', v)} type="select" options={PROVIDER_OPTIONS} />
                    <SetupField label="API Endpoint" value={fields.emailApiEndpoint} onChange={(v) => setField('emailApiEndpoint', v)} placeholder="https://api.sendgrid.com/v3/mail/send" />
                    <SecretField label="API Key" secretKey="emailApiKey" isSet={isSecretSet('emailApiKey')} value={secrets.emailApiKey ?? ''} onChange={(v) => setSecret('emailApiKey', v)} />
                    <p className="col-span-2 text-xs text-slate-500">API-based sending bypasses SMTP entirely.</p>
                </>
            )}
            {/* Common fields for all methods */}
            <SetupField label="From Address" value={fields.mailFrom} onChange={(v) => setField('mailFrom', v)} isDetected={isDetected('mailFrom')} placeholder="noreply@company.com" />
            <SetupField label="To Address" value={fields.mailTo} onChange={(v) => setField('mailTo', v)} isDetected={isDetected('mailTo')} placeholder="admin@company.com" />
            <SetupField label="Default Alert Email" value={fields.defaultAlertEmail} onChange={(v) => setField('defaultAlertEmail', v)} placeholder="alerts@company.com" />
        </>
    );
}
