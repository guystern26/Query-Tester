/**
 * Test run API — POSTs to the Splunk REST handler.
 * Endpoint: POST /splunkd/__raw/services/splunk_query_tester/query_tester
 *
 * In Vite dev mode the proxy in vite.config.ts forwards /splunkd → localhost:8000.
 * Inside Splunk Web the URL is built via @splunk/splunk-utils.
 */

import type { TestResponse } from 'core/types';
import type { ApiPayload } from '../utils/payloadBuilder';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';

const REST_PATH = 'splunk_query_tester/query_tester';
const FALLBACK_ENDPOINT = '/splunkd/__raw/services/splunk_query_tester/query_tester';

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
    url = createRESTURL(REST_PATH) + '?output_mode=json';
    init = createFetchInit({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } else {
    // Vite dev mode — direct fetch
    url = FALLBACK_ENDPOINT + '?output_mode=json';
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
  // The handler may return the TestResponse directly in content.
  const content = data?.entry?.[0]?.content;
  if (content) {
    return content as TestResponse;
  }

  // If the handler returns the TestResponse at the root level (non-standard),
  // try to use the raw body.
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
    url = createRESTURL(REST_PATH) + '?output_mode=json';
    init = createFetchInit({ method: 'DELETE' });
  } else {
    url = FALLBACK_ENDPOINT + '?output_mode=json';
    init = { method: 'DELETE', credentials: 'include' };
  }

  fetch(url, init).catch(() => {});
}
