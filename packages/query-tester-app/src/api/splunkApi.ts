/**
 * Splunk API client. Mock implementations for local dev.
 * TODO: Replace with real Splunk REST endpoints.
 */

export interface SavedSearch {
  name: string;
  app?: string;
  id?: string;
}

/**
 * TODO: Replace with real endpoint (e.g. GET /servicesNS/nobody/{app}/search/saved/searches).
 */
export async function getApps(): Promise<string[]> {
  return Promise.resolve(['search', 'my_app', 'security_app']);
}

/**
 * TODO: Replace with real endpoint (e.g. GET saved searches for app).
 */
export async function getSavedSearches(app: string): Promise<SavedSearch[]> {
  return Promise.resolve([
    { name: 'Sample Search 1', app, id: 'sample-1' },
    { name: 'Sample Search 2', app, id: 'sample-2' },
    { name: 'Sample Search 3', app, id: 'sample-3' },
  ]);
}

/**
 * TODO: Replace with real endpoint (e.g. GET saved search content by app + name).
 */
export async function getSavedSearchSpl(app: string, name: string): Promise<string> {
  return Promise.resolve(
    `| makeresults count=10 | eval _time=relative_time(now(), "-1h@h"), host="host-\${_serial}", source="src-\${_serial}"`
  );
}
