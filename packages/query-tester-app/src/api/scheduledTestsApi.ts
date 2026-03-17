/**
 * Scheduled Tests API — CRUD + run history against Splunk REST / KVStore.
 */

import type { ScheduledTest, TestRunRecord } from 'core/types';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

export class ApiError extends Error {
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

    // Handler returned raw JSON (our custom handlers do this)
    return data as T;
}

// ─── Normalization ──────────────────────────────────────────────────────────

/** KVStore may return booleans as "1"/"0" strings. Normalize to real booleans. */
function toBool(val: unknown): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val !== '0' && val !== 'false' && val !== '';
    return Boolean(val);
}

function normalizeScheduledTest(raw: Record<string, unknown>): ScheduledTest {
    return {
        ...(raw as unknown as ScheduledTest),
        enabled: toBool(raw.enabled),
        alertOnFailure: toBool(raw.alertOnFailure),
        emailRecipients: Array.isArray(raw.emailRecipients) ? raw.emailRecipients : [],
        version: Number(raw.version) || 0,
    };
}

// ─── Public API ─────────────────────────────────────────────────────────────

type CreatePayload = Omit<ScheduledTest, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus'>;

export const scheduledTestsApi = {
    async getScheduledTests(): Promise<ScheduledTest[]> {
        const url = buildUrl('data/scheduled_tests');
        const raw = await request<Array<Record<string, unknown>>>(url, 'GET');
        return (Array.isArray(raw) ? raw : []).map(normalizeScheduledTest);
    },

    async createScheduledTest(payload: CreatePayload): Promise<ScheduledTest> {
        const url = buildUrl('data/scheduled_tests');
        const raw = await request<Record<string, unknown>>(url, 'POST', payload);
        return normalizeScheduledTest(raw);
    },

    async updateScheduledTest(id: string, patch: Partial<ScheduledTest>): Promise<ScheduledTest> {
        const url = buildIdUrl('data/scheduled_tests', id);
        const raw = await request<Record<string, unknown>>(url, 'PUT', patch);
        return normalizeScheduledTest(raw);
    },

    async deleteScheduledTest(id: string): Promise<void> {
        const url = buildIdUrl('data/scheduled_tests', id);
        return request<void>(url, 'DELETE');
    },

    async runScheduledTestNow(id: string): Promise<TestRunRecord> {
        const url = buildIdUrl('data/scheduled_tests', id) + '&action=run';
        return request<TestRunRecord>(url, 'POST', { action: 'run_now' });
    },

    async getRunHistory(scheduledTestId: string): Promise<TestRunRecord[]> {
        const url = buildUrl('data/test_run_history')
            + '&scheduled_test_id=' + encodeURIComponent(scheduledTestId);
        return request<TestRunRecord[]>(url, 'GET');
    },
};
