/**
 * Test run API — POSTs to the Splunk REST handler.
 * All endpoint paths come from config/env.ts.
 */

import type { TestResponse } from 'core/types';
import type { ApiPayload } from '../utils/payloadBuilder';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';

/**
 * Check whether we're running inside Splunk Web (window.$C available).
 */
function isSplunkEnv(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof window !== 'undefined' && !!(window as any).$C;
  } catch {
    return false;
  }
}

/**
 * POST the test payload to the backend and return the parsed TestResponse.
 * Respects AbortSignal for cancellation.
 */
export async function runTest(
  payload: ApiPayload,
  signal: AbortSignal
): Promise<TestResponse> {
  let url: string;
  let init: RequestInit;

  if (isSplunkEnv()) {
    // Inside Splunk Web — use splunk-utils for correct URL + CSRF
    url = createRESTURL(ENV.REST_PATH, { app: 'QueryTester', owner: 'admin' }) + '?output_mode=json';
    const defaults = getDefaultFetchInit();
    init = {
      method: 'POST',
      credentials: defaults.credentials as RequestCredentials,
      headers: {
        ...(defaults.headers as Record<string, string>),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    };
  } else {
    // Vite dev mode — direct fetch
    url = ENV.FALLBACK_ENDPOINT + '?output_mode=json';
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal,
    };
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let errMsg = 'Backend request failed: ' + response.status + ' ' + response.statusText;
    try {
      const errBody = await response.json();
      // Splunk REST errors may be in entry[0].content or messages[]
      const messages = errBody.messages;
      if (Array.isArray(messages) && messages.length > 0) {
        errMsg = messages.map((m: { text?: string }) => m.text || '').join('; ') || errMsg;
      }
    } catch {
      // Could not parse error body — use status text
    }
    throw new Error(errMsg);
  }

  const data = await response.json();

  // Splunk REST envelope: the response content is inside entry[0].content
  const content = data?.entry?.[0]?.content;
  if (content) {
    return content as TestResponse;
  }

  // If the handler returns the TestResponse at the root level (non-standard)
  if (data && typeof data.status === 'string' && 'scenarioResults' in data) {
    return data as TestResponse;
  }

  throw new Error('Unexpected response shape from backend');
}

/**
 * Send a DELETE to cancel the currently running search job on the backend.
 * Fire-and-forget — errors are silently ignored since the user already moved on.
 */
export function cancelTestOnBackend(): void {
  let url: string;
  let init: RequestInit;

  if (isSplunkEnv()) {
    url = createRESTURL(ENV.REST_PATH, { app: 'QueryTester', owner: 'admin' }) + '?output_mode=json';
    const defaults2 = getDefaultFetchInit();
    init = {
      method: 'DELETE',
      credentials: defaults2.credentials as RequestCredentials,
      headers: defaults2.headers as Record<string, string>,
    };
  } else {
    url = ENV.FALLBACK_ENDPOINT + '?output_mode=json';
    init = { method: 'DELETE', credentials: 'include' };
  }

  fetch(url, init).catch(() => {});
}
