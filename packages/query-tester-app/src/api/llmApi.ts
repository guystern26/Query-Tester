/**
 * LLM API — extract data sources and validation fields from SPL using OpenAI ChatGPT.
 */

import type { ExtractedDataSource } from 'core/types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = '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';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1024;

/**
 * Strip markdown fences and whitespace from LLM response text before parsing.
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  return cleaned.trim();
}

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
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
