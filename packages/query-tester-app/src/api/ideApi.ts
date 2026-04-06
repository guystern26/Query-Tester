/**
 * IDE Run API — POST to the backend IDE endpoint.
 * Same REST call pattern as testApi.ts.
 */

import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';

/** Shape returned by POST /data/tester/ide_run */
export interface IdeRunResponse {
    status: 'success' | 'error';
    message?: string;
    resultCount: number;
    executionTimeMs: number;
    resultRows: Record<string, string>[];
    splAnalysis: {
        unauthorizedCommands: string[];
        unusualCommands: string[];
        uniqLimitations: string | null;
        commandsUsed: string[];
        warnings: Array<{ message: string; severity: string }>;
    };
    aiNotes: Array<{ id: string; severity: string; category: string; message: string; suggestion: string | null }>;
    warnings: Array<{ message: string; severity: string }>;
    errors: Array<{ code: string; message: string; severity: string }>;
}

interface IdeRunPayload {
    app: string;
    query: string;
    timeRange?: { earliest: string; latest: string };
    userContext?: string;
    priorAnalysis?: Array<{ severity: string; category: string; message: string }>;
    allowBlocked?: boolean;
}

function isSplunkEnv(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof window !== 'undefined' && !!(window as any).$C;
    } catch {
        return false;
    }
}

const IDE_SUB_PATH = '/ide_run';
const ANALYZE_SUB_PATH = '/analyze_spl';

/** Shape of a single analysis note from the backend. */
export interface AnalysisNote {
    id: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    line: number | null;
    suggestion: string | null;
    source?: 'static' | 'llm';
}

/** Shape returned by POST /data/tester/analyze_spl */
export interface AnalysisResult {
    notes: AnalysisNote[];
    fieldUsage: {
        input: string[];
        created: string[];
        available_unused: string[];
    };
}

/**
 * Execute a query via the IDE endpoint.
 * Returns the full IdeRunResponse on success or throws on network errors.
 */
export async function runIdeQuery(
    app: string,
    spl: string,
    timeRange?: { earliest: string; latest: string },
    userContext?: string,
    priorAnalysis?: Array<{ severity: string; category: string; message: string }>,
    signal?: AbortSignal,
    allowBlocked?: boolean,
): Promise<IdeRunResponse> {
    const body: IdeRunPayload = { app, query: spl };
    if (timeRange) body.timeRange = timeRange;
    if (userContext) body.userContext = userContext;
    if (priorAnalysis && priorAnalysis.length > 0) body.priorAnalysis = priorAnalysis;
    if (allowBlocked) body.allowBlocked = true;

    let url: string;
    let init: RequestInit;

    if (isSplunkEnv()) {
        url = createRESTURL(ENV.REST_PATH + IDE_SUB_PATH, {
            app: 'QueryTester',
            owner: 'admin',
        }) + '?output_mode=json';
        const defaults = getDefaultFetchInit();
        init = {
            method: 'POST',
            credentials: defaults.credentials as RequestCredentials,
            headers: {
                ...(defaults.headers as Record<string, string>),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        };
    } else {
        url = ENV.FALLBACK_ENDPOINT + IDE_SUB_PATH + '?output_mode=json';
        init = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
            signal,
        };
    }

    const response = await fetch(url, init);

    if (!response.ok) {
        let errMsg = 'IDE request failed: ' + response.status + ' ' + response.statusText;
        try {
            const errBody = await response.json();
            const messages = errBody.messages;
            if (Array.isArray(messages) && messages.length > 0) {
                errMsg = messages.map((m: { text?: string }) => m.text || '').join('; ') || errMsg;
            }
            // Also check for direct error field (our handler returns this)
            const content = errBody?.entry?.[0]?.content;
            if (content?.error) {
                errMsg = content.error;
            } else if (errBody?.entry?.[0]?.content?.message) {
                errMsg = errBody.entry[0].content.message;
            }
        } catch {
            // Could not parse error body
        }
        throw new Error(errMsg);
    }

    const data = await response.json();

    // Splunk REST envelope
    const content = data?.entry?.[0]?.content;
    if (content && typeof content.status === 'string') {
        return content as IdeRunResponse;
    }

    // Direct response (non-envelope)
    if (data && typeof data.status === 'string' && 'resultRows' in data) {
        return data as IdeRunResponse;
    }

    throw new Error('Unexpected response shape from IDE endpoint');
}

/**
 * Analyze SPL via the backend analysis endpoint.
 * Returns static + LLM analysis notes.
 */
export async function analyzeSpl(
    spl: string,
    app: string,
    userContext: string,
    signal?: AbortSignal,
): Promise<AnalysisResult> {
    const body = { spl, app, userContext };

    let url: string;
    let init: RequestInit;

    if (isSplunkEnv()) {
        url = createRESTURL(ENV.REST_PATH + ANALYZE_SUB_PATH, {
            app: 'QueryTester',
            owner: 'admin',
        }) + '?output_mode=json';
        const defaults = getDefaultFetchInit();
        init = {
            method: 'POST',
            credentials: defaults.credentials as RequestCredentials,
            headers: {
                ...(defaults.headers as Record<string, string>),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        };
    } else {
        url = ENV.FALLBACK_ENDPOINT + ANALYZE_SUB_PATH + '?output_mode=json';
        init = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
            signal,
        };
    }

    const response = await fetch(url, init);

    if (!response.ok) {
        let errMsg = 'Analysis request failed: ' + response.status;
        try {
            const errBody = await response.json();
            const content = errBody?.entry?.[0]?.content;
            if (content?.error) errMsg = content.error;
        } catch {
            // ignore parse errors
        }
        throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data?.entry?.[0]?.content;
    if (content && Array.isArray(content.notes)) {
        return content as AnalysisResult;
    }
    if (data && Array.isArray(data.notes)) {
        return data as AnalysisResult;
    }
    return { notes: [], fieldUsage: { input: [], created: [], available_unused: [] } };
}
