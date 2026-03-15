/**
 * Saved Tests (Test Library) API — CRUD against Splunk REST / KVStore.
 */

import type { SavedTestFull, TestDefinition } from 'core/types';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function buildUrl(path: string): string {
    return createRESTURL(path, REST_OPTS) + '?output_mode=json';
}

function buildIdUrl(path: string, id: string): string {
    return createRESTURL(path, REST_OPTS) + '?output_mode=json&id=' + encodeURIComponent(id);
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
            const messages = err.messages;
            if (Array.isArray(messages) && messages.length > 0) {
                msg = messages.map((m: { text?: string }) => m.text || '').join('; ') || msg;
            } else if (err.error) {
                msg = String(err.error);
            }
        } catch {
            // use status text
        }
        throw new ApiError(msg, res.status);
    }

    if (res.status === 204 || method === 'DELETE') {
        return undefined as unknown as T;
    }

    const data = await res.json();

    // Unwrap Splunk REST envelope if present
    const entry = data?.entry;
    if (Array.isArray(entry) && entry.length > 0 && entry[0].content !== undefined) {
        return entry[0].content as T;
    }

    return data as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

interface SavePayload {
    name: string;
    description: string;
    definition: TestDefinition;
}

interface UpdatePayload {
    name?: string;
    description?: string;
    definition?: TestDefinition;
}

export const savedTestsApi = {
    async listTests(): Promise<SavedTestFull[]> {
        const url = buildUrl('data/saved_tests');
        return request<SavedTestFull[]>(url, 'GET');
    },

    async saveTest(payload: SavePayload): Promise<SavedTestFull> {
        const url = buildUrl('data/saved_tests');
        return request<SavedTestFull>(url, 'POST', {
            name: payload.name,
            description: payload.description,
            app: payload.definition.app,
            testType: payload.definition.testType,
            validationType: payload.definition.validation?.validationType ?? 'standard',
            scenarioCount: payload.definition.scenarios?.length ?? 0,
            definition: payload.definition,
        });
    },

    async updateTest(id: string, payload: UpdatePayload): Promise<SavedTestFull> {
        const url = buildIdUrl('data/saved_tests', id);
        const body: Record<string, unknown> = {};
        if (payload.name !== undefined) body.name = payload.name;
        if (payload.description !== undefined) body.description = payload.description;
        if (payload.definition !== undefined) {
            body.definition = payload.definition;
            body.testType = payload.definition.testType;
            body.validationType = payload.definition.validation?.validationType ?? 'standard';
            body.scenarioCount = payload.definition.scenarios?.length ?? 0;
            body.app = payload.definition.app;
        }
        return request<SavedTestFull>(url, 'PUT', body);
    },

    async deleteTest(id: string): Promise<void> {
        const url = buildIdUrl('data/saved_tests', id);
        return request<void>(url, 'DELETE');
    },
};
