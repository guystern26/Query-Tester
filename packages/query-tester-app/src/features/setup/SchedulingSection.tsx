import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField } from './SetupField';
import { useSectionFields } from './useSectionFields';

const FIELD_KEYS: Array<keyof AppConfig> = ['maxParallelTests'];

export function SchedulingSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, isDetected, getPlainFields } = useSectionFields(appConfig, FIELD_KEYS);

    return (
        <SetupSection
            title="Scheduling"
            note="How many scheduled tests can run simultaneously. Higher values use more Splunk resources."
            getPlainFields={getPlainFields}
        >
            <SetupField
                label="Max Parallel Tests"
                value={fields.maxParallelTests || '5'}
                onChange={(v) => setField('maxParallelTests', v)}
                isDetected={isDetected('maxParallelTests')}
                placeholder="5"
            />
        </SetupSection>
    );
}
