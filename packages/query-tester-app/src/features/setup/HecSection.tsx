import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField, SetupToggle } from './SetupField';
import { SecretField } from './SecretField';
import { useSectionFields } from './useSectionFields';

const SCHEME_OPTIONS = [
    { value: 'http', label: 'http' },
    { value: 'https', label: 'https' },
];

const FIELD_KEYS: Array<keyof AppConfig> = [
    'hecHost', 'hecPort', 'hecScheme', 'hecSslVerify', 'hecTimeout',
];

export function HecSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, secrets, setSecret, isDetected, isSecretSet, getPlainFields, getSecretFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    const multipleHecNote = appConfig?._detected?.includes('hecHost') && !appConfig?._detected?.includes('hecToken')
        ? 'Multiple HEC tokens detected \u2014 enter the one for this app.'
        : undefined;

    return (
        <SetupSection
            title="HEC (HTTP Event Collector)"
            note="HEC must be enabled on this Splunk instance with a valid token."
            getPlainFields={getPlainFields}
            getSecretFields={() => getSecretFields()}
        >
            <SetupField
                label="Host" value={fields.hecHost} onChange={(v) => setField('hecHost', v)}
                isDetected={isDetected('hecHost')} placeholder="localhost"
            />
            <SetupField
                label="Port" value={fields.hecPort} onChange={(v) => setField('hecPort', v)}
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
            <SecretField
                label="HEC Token" secretKey="hecToken"
                isSet={isSecretSet('hecToken')}
                value={secrets.hecToken ?? ''}
                onChange={(v) => setSecret('hecToken', v)}
                placeholder={multipleHecNote ?? 'not configured'}
            />
        </SetupSection>
    );
}
