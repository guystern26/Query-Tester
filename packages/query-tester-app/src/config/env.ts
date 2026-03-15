/**
 * env.ts — Deployment Configuration
 * ===================================
 * EDIT THIS FILE WHEN DEPLOYING TO A NEW SPLUNK INSTANCE.
 * This is the ONLY file you need to change for frontend environment settings.
 * No other TypeScript file should contain hardcoded environment-specific values.
 *
 * NOTE: After editing this file you MUST rebuild the frontend (webpack build)
 * for changes to take effect.
 */

export const ENV = {
  // ─── REST Handler ──────────────────────────────────────────────────────
  // Must match restmap.conf [script:...] match path
  REST_PATH: 'data/tester',

  // Fallback endpoint for Vite dev mode (proxied via vite.config.ts)
  FALLBACK_ENDPOINT: '/splunkd/__raw/servicesNS/admin/QueryTester/data/tester',

  // ─── Splunk Services ──────────────────────────────────────────────────
  // Base path for Splunk REST API calls (apps, saved searches, etc.)
  SPLUNK_SERVICES_BASE: '/splunkd/__raw/services',

  // Backend endpoint (inner network)
  BACKEND_ENDPOINT: 'servicesNS/admin/playground/data/tester',

  // Splunk base URL
  SPLUNK_BASE: 'http://splunk:8089',

  // Apps endpoint
  APPS_ENDPOINT: 'http://splunk:8089/services/apps/local/?output_mode=json&count=1000',

  // ─── LLM / AI ─────────────────────────────────────────────────────────
  // Set to empty string '' to disable AI extract buttons
  LLM_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
  LLM_API_KEY: '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',  // move to secure storage for production
  LLM_MODEL: 'gpt-4o-mini',
  LLM_MAX_TOKENS: 1024,

  // ─── Limits ────────────────────────────────────────────────────────────
  MAX_QUERY_DATA_EVENTS: 10_000,
} as const;
