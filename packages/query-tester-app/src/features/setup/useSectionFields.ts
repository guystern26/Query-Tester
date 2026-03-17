import { useState, useCallback, useMemo } from 'react';
import type { AppConfig } from 'core/types/config';

type FieldKey = keyof AppConfig;

/**
 * Manages local field state for a setup section. Initializes from appConfig,
 * tracks which fields are auto-detected, and provides getters for save.
 */
export function useSectionFields(
    appConfig: AppConfig | null,
    fieldKeys: FieldKey[],
) {
    const defaults = useMemo(() => {
        const d: Record<string, string> = {};
        for (const k of fieldKeys) {
            const val = appConfig ? appConfig[k as keyof AppConfig] : '';
            d[k] = typeof val === 'boolean' ? String(val) : String(val ?? '');
        }
        return d;
    }, [appConfig, fieldKeys]);

    const [fields, setFields] = useState<Record<string, string>>(defaults);
    const [secrets, setSecrets] = useState<Record<string, string>>({});

    const detected = useMemo(() => {
        const d = new Set(appConfig?._detected ?? []);
        return d;
    }, [appConfig]);

    const setField = useCallback((key: string, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setSecret = useCallback((key: string, value: string) => {
        setSecrets((prev) => ({ ...prev, [key]: value }));
    }, []);

    const isDetected = useCallback((key: string): boolean => {
        return detected.has(key);
    }, [detected]);

    const getPlainFields = useCallback((): Partial<AppConfig> => {
        const result: Record<string, unknown> = {};
        for (const k of fieldKeys) {
            result[k] = fields[k] ?? '';
        }
        return result as Partial<AppConfig>;
    }, [fields, fieldKeys]);

    const getSecretFields = useCallback((): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(secrets)) {
            if (v) result[k] = v;
        }
        return result;
    }, [secrets]);

    const isSecretSet = useCallback((key: string): boolean => {
        if (!appConfig?.secrets) return false;
        const entry = (appConfig.secrets as Record<string, { set: boolean }>)[key];
        return entry?.set ?? false;
    }, [appConfig]);

    return {
        fields,
        setField,
        secrets,
        setSecret,
        isDetected,
        isSecretSet,
        getPlainFields,
        getSecretFields,
    };
}
