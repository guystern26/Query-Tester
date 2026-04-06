/**
 * splunkRestApi.ts — Proxy Splunk REST calls through the backend for the AI agent.
 */

import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';

function isSplunkEnv(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof window !== 'undefined' && !!(window as any).$C;
    } catch {
        return false;
    }
}

export interface SplunkRestEntry {
    name: string;
    id: string;
    content: Record<string, unknown>;
}

export interface SplunkRestResponse {
    entries: SplunkRestEntry[];
    totalCount: number;
    path: string;
}

/**
 * Call a whitelisted Splunk REST endpoint through the backend proxy.
 * Only GET-equivalent (read-only) calls are allowed.
 */
export async function callSplunkRest(
    path: string,
    params?: Record<string, string>,
): Promise<SplunkRestResponse> {
    let url: string;
    let init: RequestInit;

    const body = JSON.stringify({ path, params: params || {} });

    if (isSplunkEnv()) {
        url =
            createRESTURL(ENV.REST_PATH + '/splunk_rest', {
                app: 'QueryTester',
                owner: 'admin',
            }) + '?output_mode=json';
        const defaults = getDefaultFetchInit();
        init = {
            ...defaults,
            method: 'POST',
            headers: {
                ...(defaults.headers as Record<string, string>),
                'Content-Type': 'application/json',
            },
            body,
        };
    } else {
        url = ENV.FALLBACK_ENDPOINT + '/splunk_rest?output_mode=json';
        init = {
            method: 'POST',
            credentials: 'include' as RequestCredentials,
            headers: { 'Content-Type': 'application/json' },
            body,
        };
    }

    const res = await fetch(url, init);
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error('Splunk REST proxy failed (' + res.status + '): ' + errText.slice(0, 200));
    }

    const data = await res.json();
    const content = data?.entry?.[0]?.content;
    if (content && Array.isArray(content.entries)) {
        return content as SplunkRestResponse;
    }
    if (data && Array.isArray(data.entries)) {
        return data as SplunkRestResponse;
    }
    throw new Error('Unexpected response from Splunk REST proxy');
}
