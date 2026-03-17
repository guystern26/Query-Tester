import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { AppConfig } from 'core/types/config';
import { SetupSection } from './SetupSection';
import { SetupField } from './SetupField';
import { SecretField } from './SecretField';
import { useSectionFields } from './useSectionFields';

const FIELD_KEYS: Array<keyof AppConfig> = [
    'llmEndpoint', 'llmModel', 'llmMaxTokens',
];

export function LlmSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const { fields, setField, secrets, setSecret, isSecretSet, getPlainFields, getSecretFields } =
        useSectionFields(appConfig, FIELD_KEYS);

    return (
        <SetupSection
            title="AI / LLM"
            note="Leave all fields blank to disable AI features."
            getPlainFields={getPlainFields}
            getSecretFields={() => getSecretFields()}
        >
            <SetupField
                label="Endpoint" value={fields.llmEndpoint}
                onChange={(v) => setField('llmEndpoint', v)}
                placeholder="https://api.anthropic.com/v1/messages"
                fullWidth
            />
            <SecretField
                label="API Key" secretKey="llmApiKey"
                isSet={isSecretSet('llmApiKey')}
                value={secrets.llmApiKey ?? ''}
                onChange={(v) => setSecret('llmApiKey', v)}
            />
            <SetupField
                label="Model" value={fields.llmModel}
                onChange={(v) => setField('llmModel', v)}
                placeholder="claude-sonnet-4-20250514"
            />
            <SetupField
                label="Max Tokens" value={fields.llmMaxTokens}
                onChange={(v) => setField('llmMaxTokens', v)}
                placeholder="4096"
            />
        </SetupSection>
    );
}
