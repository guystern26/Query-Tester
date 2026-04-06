import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField } from './SetupField';
import { useSectionFields } from './useSectionFields';

const FIELD_KEYS: Array<keyof AppConfig> = ['splunkWebUrl'];

export function WebUrlSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, isDetected, getPlainFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    return (
        <SetupSection
            title="Splunk Web URL"
            note="Used to build links in email alert notifications."
            getPlainFields={getPlainFields}
        >
            <SetupField
                label="Web URL" value={fields.splunkWebUrl}
                onChange={(v) => setField('splunkWebUrl', v)}
                isDetected={isDetected('splunkWebUrl')}
                placeholder="https://splunk.company.com:8000"
                fullWidth
            />
        </SetupSection>
    );
}
