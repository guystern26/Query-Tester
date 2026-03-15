/**
 * Splunk REST API client.
 * Uses @splunk/splunk-utils for URL building and CSRF-protected fetch.
 * Falls back to direct fetch against inner network endpoints outside Splunk Web.
 */

import { createRESTURL } from '@splunk/splunk-utils/url';
import { createFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';

export interface SavedSearch {
  name: string;
  app?: string;
}

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
 * Direct fetch for use outside Splunk Web (inner network).
 */
async function directFetch(url: string): Promise<Record<string, unknown>> {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = url + separator + 'output_mode=json&count=1000';
  const response = await fetch(fullUrl, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(
      'Splunk API request failed: ' + response.status + ' ' + response.statusText
    );
  }
  return response.json();
}

/**
 * Fetch all visible Splunk apps.
 * Inside Splunk: GET /servicesNS/-/-/apps/local → entry[].name
 * Outside Splunk: GET http://splunk:8089/services/apps/local/
 */
export async function getApps(): Promise<string[]> {
  let data: Record<string, unknown>;

  if (isSplunkEnv()) {
    const url = createRESTURL('apps/local');
    data = await splunkFetch(url);
  } else {
    data = await directFetch(ENV.APPS_ENDPOINT);
  }

  const entries = (data as { entry?: Array<{ name?: string; content?: { visible?: boolean; disabled?: boolean } }> }).entry;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter((e) => {
      const content = e.content;
      if (content && content.disabled === true) return false;
      if (content && content.visible === false) return false;
      return typeof e.name === 'string';
    })
    .map((e) => e.name as string);
}

/**
 * Fetch saved searches for a specific app.
 * Inside Splunk: GET /servicesNS/-/{app}/saved/searches
 * Outside Splunk: GET http://splunk:8089/servicesNS/admin/{app}/saved/searches
 */
export async function getSavedSearches(app: string): Promise<SavedSearch[]> {
  try {
    let data: Record<string, unknown>;

    if (isSplunkEnv()) {
      const url = createRESTURL('saved/searches', { app, sharing: 'app' });
      data = await splunkFetch(url);
    } else {
      const url = ENV.SPLUNK_BASE + '/servicesNS/admin/' + encodeURIComponent(app) + '/saved/searches?output_mode=json&count=1000';
      data = await directFetch(url);
    }

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
  const encoded = encodeURIComponent(name);
  let data: Record<string, unknown>;

  if (isSplunkEnv()) {
    const url = createRESTURL('saved/searches/' + encoded, { app });
    data = await splunkFetch(url);
  } else {
    const url = ENV.SPLUNK_BASE + '/servicesNS/admin/' + encodeURIComponent(app) + '/saved/searches/' + encoded + '?output_mode=json';
    data = await directFetch(url);
  }

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
