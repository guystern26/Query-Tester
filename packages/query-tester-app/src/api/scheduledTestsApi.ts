/**
 * Scheduled Tests API — CRUD + run history against Splunk REST / KVStore.
 */

import type { ScheduledTest, TestRunRecord } from 'core/types';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';

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
    const opts: Record<string, unknown> = { method };
    if (body !== undefined) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
    }
    const init = createFetchInit(opts);
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

// ─── Public API ─────────────────────────────────────────────────────────────

type CreatePayload = Omit<ScheduledTest, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus'>;

export const scheduledTestsApi = {
    async getScheduledTests(): Promise<ScheduledTest[]> {
        const url = buildUrl('data/scheduled_tests');
        return request<ScheduledTest[]>(url, 'GET');
    },

    async createScheduledTest(payload: CreatePayload): Promise<ScheduledTest> {
        const url = buildUrl('data/scheduled_tests');
        return request<ScheduledTest>(url, 'POST', payload);
    },

    async updateScheduledTest(id: string, patch: Partial<ScheduledTest>): Promise<ScheduledTest> {
        const url = buildIdUrl('data/scheduled_tests', id);
        return request<ScheduledTest>(url, 'PUT', patch);
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
