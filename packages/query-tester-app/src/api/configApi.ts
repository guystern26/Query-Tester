/**
 * Config & Command Policy API — admin configuration CRUD.
 * Mapping logic lives in configApiMappers.ts.
 */

import type {
    AppConfig,
    CommandPolicyEntry,
    ConnectionTestResult,
    ConfigStatus,
    EmailDetectResult,
} from 'core/types/config';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import {
    mapConfigResponse,
    mapPolicyEntry,
    policyEntryToSnake,
    plainToSnake,
    secretsToSnake,
    mapConnectionResult,
    mapEmailDetectResult,
    camelToSnakeKey,
} from './configApiMappers';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

function buildUrl(path: string): string {
    return createRESTURL(path, REST_OPTS) + '?output_mode=json';
}

async function request<T>(url: string, method: string, body?: unknown): Promise<T> {
    const defaults = getDefaultFetchInit();
    const headers: Record<string, string> = { ...(defaults.headers as Record<string, string>) };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    const init: RequestInit = {
        method,
        credentials: defaults.credentials as RequestCredentials,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(url, init);
    if (!res.ok) {
        let msg = res.status + ' ' + res.statusText;
        try {
            const err = await res.json();
            if (Array.isArray(err.messages) && err.messages.length > 0) {
                msg = err.messages.map((m: { text?: string }) => m.text || '').join('; ') || msg;
            } else if (err.error) {
                msg = String(err.error);
            }
        } catch {
            // use status text
        }
        throw new ApiError(msg, res.status);
    }
    if (res.status === 204) return undefined as unknown as T;
    const data = await res.json();
    const entry = data?.entry;
    if (Array.isArray(entry) && entry.length > 0 && entry[0].content !== undefined) {
        return entry[0].content as T;
    }
    return data as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const configApi = {
    async getConfig(): Promise<AppConfig> {
        const raw = await request<Record<string, unknown>>(buildUrl('data/tester/config'), 'GET');
        return mapConfigResponse(raw);
    },

    async getSecret(name: string): Promise<string> {
        const snakeName = camelToSnakeKey(name);
        const url = buildUrl('data/tester/config/secret/' + encodeURIComponent(snakeName));
        const data = await request<{ value: string | null }>(url, 'GET');
        return data.value ?? '';
    },

    async saveConfigSection(
        plain: Partial<AppConfig>,
        secrets?: Record<string, string>,
    ): Promise<AppConfig> {
        const body: Record<string, unknown> = { plain: plainToSnake(plain) };
        if (secrets) body.secrets = secretsToSnake(secrets);
        const raw = await request<Record<string, unknown>>(buildUrl('data/tester/config'), 'POST', body);
        return mapConfigResponse(raw);
    },

    async testConnection(): Promise<ConnectionTestResult> {
        const raw = await request<Record<string, unknown>>(buildUrl('data/tester/config/test'), 'POST');
        return mapConnectionResult(raw);
    },

    async getConfigStatus(): Promise<ConfigStatus> {
        const raw = await request<Record<string, unknown>>(buildUrl('data/tester/config/status'), 'GET');
        return {
            configured: raw.configured === true,
            isAdmin: raw.is_admin === true,
        };
    },

    async detectEmailConfig(): Promise<EmailDetectResult> {
        const raw = await request<Record<string, unknown>>(buildUrl('data/tester/config/email/detect'), 'GET');
        return mapEmailDetectResult(raw);
    },

    async getCommandPolicy(): Promise<CommandPolicyEntry[]> {
        const raw = await request<Array<Record<string, unknown>>>(buildUrl('data/tester/command_policy'), 'GET');
        return raw.map(mapPolicyEntry);
    },

    async saveCommandPolicy(entries: CommandPolicyEntry[]): Promise<void> {
        await request<unknown>(buildUrl('data/tester/command_policy'), 'POST', {
            entries: entries.map(policyEntryToSnake),
        });
    },

    async resetCommandPolicy(): Promise<CommandPolicyEntry[]> {
        const raw = await request<Array<Record<string, unknown>>>(
            buildUrl('data/tester/command_policy'), 'POST', { reset: true },
        );
        return raw.map(mapPolicyEntry);
    },

    async saveCommandPolicyEntry(entry: CommandPolicyEntry): Promise<void> {
        await request<unknown>(buildUrl('data/tester/command_policy/single'), 'POST', policyEntryToSnake(entry));
    },

    async deleteCommandPolicyEntry(command: string): Promise<void> {
        const url = buildUrl('data/tester/command_policy') + '&command=' + encodeURIComponent(command);
        await request<void>(url, 'DELETE');
    },
};
