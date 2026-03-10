/**
 * LLM API — extract data sources and validation fields from SPL.
 * All endpoint/key config comes from config/env.ts.
 */

import type { ExtractedDataSource } from 'core/types';
import { ENV } from '../config/env';

/**
 * Strip markdown fences and whitespace from LLM response text before parsing.
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  return cleaned.trim();
}

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ENV.LLM_ENDPOINT) {
    throw new Error('AI features are disabled. Set LLM_ENDPOINT in config/env.ts.');
  }
  if (!ENV.LLM_API_KEY) {
    throw new Error('LLM API key is not configured. Set LLM_API_KEY in config/env.ts.');
  }

  const body = {
    model: ENV.LLM_MODEL,
    max_tokens: ENV.LLM_MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };

  const res = await fetch(ENV.LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ENV.LLM_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('Invalid API key.');
    throw new Error('LLM request failed (' + res.status + '): ' + errText.slice(0, 200));
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error('Empty response from LLM');
  }
  return choice.message.content;
}

/**
 * Extract data sources and their input fields from SPL.
 */
export async function extractDataSources(spl: string): Promise<ExtractedDataSource[]> {
  const system =
    'You are a Splunk SPL analyzer. Given a SPL query, identify every data source that provides INPUT rows to the query (indexes, inputlookup, lookup match fields, subsearch sources, join left-side sources). For each source, list the field names that the query reads FROM that source (not fields it creates). Return ONLY a JSON object where keys are the exact source strings as they appear in the SPL (e.g. "index=main sourcetype=access") and values are arrays of field name strings. No explanation. No markdown. JSON only.';

  const raw = await callLLM(system, spl);
  const cleaned = cleanJsonResponse(raw);

  let parsed: Record<string, string[]>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON: ' + cleaned.slice(0, 100));
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object from LLM, got: ' + typeof parsed);
  }

  return Object.entries(parsed).map(([rowIdentifier, fields]) => ({
    rowIdentifier,
    fields: Array.isArray(fields) ? fields.map(String) : [],
  }));
}

/**
 * Extract output/validation fields from SPL.
 */
export async function extractValidationFields(spl: string): Promise<string[]> {
  const system =
    'You are a Splunk SPL analyzer. Given a SPL query, identify the OUTPUT fields that the query produces — fields that would appear in the final results table (from table, stats, eval, rename...as, rex field=, mvexpand, etc.). Return ONLY a JSON array of field name strings. No explanation. No markdown. JSON only.';

  const raw = await callLLM(system, spl);
  const cleaned = cleanJsonResponse(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    throw new Error('not array');
  } catch {
    if (cleaned.includes(',')) {
      return cleaned.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    throw new Error('Failed to parse LLM response: ' + cleaned.slice(0, 100));
  }
}
