import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField } from './SetupField';
import { SecretField } from './SecretField';
import { useSectionFields } from './useSectionFields';

const SCHEME_OPTIONS = [
    { value: 'http', label: 'http' },
    { value: 'https', label: 'https' },
];

const FIELD_KEYS: Array<keyof AppConfig> = [
    'splunkHost', 'splunkPort', 'splunkScheme', 'splunkUsername',
];

export function SplunkSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, secrets, setSecret, isDetected, isSecretSet, getPlainFields, getSecretFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    return (
        <SetupSection
            title="Splunk Connection"
            getPlainFields={getPlainFields}
            getSecretFields={() => getSecretFields()}
        >
            <SetupField
                label="Host" value={fields.splunkHost} onChange={(v) => setField('splunkHost', v)}
                isDetected={isDetected('splunkHost')} placeholder="localhost"
            />
            <SetupField
                label="Port" value={fields.splunkPort} onChange={(v) => setField('splunkPort', v)}
                isDetected={isDetected('splunkPort')} placeholder="8089"
            />
            <SetupField
                label="Scheme" value={fields.splunkScheme} onChange={(v) => setField('splunkScheme', v)}
                isDetected={isDetected('splunkScheme')} type="select" options={SCHEME_OPTIONS}
            />
            <SetupField
                label="Username" value={fields.splunkUsername} onChange={(v) => setField('splunkUsername', v)}
                placeholder="admin"
            />
            <SecretField
                label="Password" secretKey="splunkPassword"
                isSet={isSecretSet('splunkPassword')}
                value={secrets.splunkPassword ?? ''}
                onChange={(v) => setSecret('splunkPassword', v)}
                placeholder="not configured"
            />
        </SetupSection>
    );
}
