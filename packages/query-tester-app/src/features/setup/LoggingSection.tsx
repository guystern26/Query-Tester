import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField } from './SetupField';
import { useSectionFields } from './useSectionFields';

const FIELD_KEYS: Array<keyof AppConfig> = ['logLevel', 'logFile'];

const LOG_LEVEL_OPTIONS = [
    { value: 'DEBUG', label: 'DEBUG' },
    { value: 'INFO', label: 'INFO' },
    { value: 'WARNING', label: 'WARNING' },
    { value: 'ERROR', label: 'ERROR' },
];

export function LoggingSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, getPlainFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    return (
        <SetupSection title="Logging" getPlainFields={getPlainFields}>
            <SetupField
                label="Log Level" value={fields.logLevel || 'INFO'}
                onChange={(v) => setField('logLevel', v)}
                type="select" options={LOG_LEVEL_OPTIONS}
            />
            <SetupField
                label="Log File" value={fields.logFile}
                onChange={(v) => setField('logFile', v)}
                placeholder="$SPLUNK_HOME/var/log/splunk/query_tester.log"
            />
        </SetupSection>
    );
}
