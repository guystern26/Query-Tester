/**
 * Splunk REST API client.
 * Uses @splunk/splunk-utils for URL building and CSRF-protected fetch.
 * Falls back to empty results when running outside Splunk (Vite dev).
 */

import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';

export interface SavedSearch {
  name: string;
  app?: string;
}

/**
 * Check whether we're running inside Splunk Web (window.$C available).
 * When running in Vite dev mode, Splunk utils won't have config and API
 * calls would fail — return mock/empty data instead.
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
 * Wrapper around fetch that includes CSRF token and credentials.
 * Appends output_mode=json to the URL for Splunk REST endpoints.
 */
async function splunkFetch(url: string): Promise<Record<string, unknown>> {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = url + separator + 'output_mode=json&count=0';
  const init = createFetchInit({ method: 'GET' });
  const response = await fetch(fullUrl, init);
  if (!response.ok) {
    throw new Error(
      'Splunk API request failed: ' + response.status + ' ' + response.statusText
    );
  }
  return response.json();
}

/**
 * Fetch all visible Splunk apps.
 * GET /servicesNS/-/-/apps/local → entry[].name
 */
export async function getApps(): Promise<string[]> {
  if (!isSplunkEnv()) {
    // Not inside Splunk Web — return empty so caller can fall back
    return [];
  }

  const url = createRESTURL('apps/local');
  const data = await splunkFetch(url);
  const entries = (data as { entry?: Array<{ name?: string; content?: { visible?: boolean; disabled?: boolean } }> }).entry;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter((e) => {
      // Only show visible, non-disabled apps
      const content = e.content;
      if (content && content.disabled === true) return false;
      if (content && content.visible === false) return false;
      return typeof e.name === 'string';
    })
    .map((e) => e.name as string);
}

/**
 * Fetch saved searches for a specific app.
 * GET /servicesNS/-/{app}/saved/searches → entry[].name
 */
export async function getSavedSearches(app: string): Promise<SavedSearch[]> {
  if (!isSplunkEnv()) {
    return [];
  }

  try {
    const url = createRESTURL('saved/searches', { app, sharing: 'app' });
    const data = await splunkFetch(url);
    const entries = (data as { entry?: Array<{ name?: string }> }).entry;
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries
      .filter((e) => typeof e.name === 'string')
      .map((e) => ({ name: e.name as string, app }));
  } catch {
    return [];
  }
}

/**
 * Fetch the SPL of a specific saved search.
 * GET /servicesNS/-/{app}/saved/searches/{name} → entry[0].content.search
 */
export async function getSavedSearchSpl(app: string, name: string): Promise<string> {
  if (!isSplunkEnv()) {
    return '';
  }

  const encoded = encodeURIComponent(name);
  const url = createRESTURL('saved/searches/' + encoded, { app });
  const data = await splunkFetch(url);
  const entries = (data as {
    entry?: Array<{ content?: { search?: string } }>;
  }).entry;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Saved search "' + name + '" not found in app "' + app + '".');
  }

  const spl = entries[0].content?.search;
  if (typeof spl !== 'string') {
    throw new Error(
      'Saved search "' + name + '" exists but has no SPL content.'
    );
  }
  return spl;
}
