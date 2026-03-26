/**
 * LLM API — extract data sources and validation fields from SPL.
 * Calls go through the Splunk backend proxy (no direct browser→LLM calls).
 */

import type { ExtractedDataSource } from 'core/types';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';
import {
    EXTRACT_DATA_SOURCES_PROMPT,
    EXTRACT_VALIDATION_FIELDS_PROMPT,
    ANALYZE_QUERY_PROMPT,
} from './llmPrompts';

function isSplunkEnv(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof window !== 'undefined' && !!(window as any).$C;
    } catch {
        return false;
    }
}

function cleanJsonResponse(text: string): string {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    return cleaned.trim();
}

async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
    let url: string;
    let init: RequestInit;

    if (isSplunkEnv()) {
        url =
            createRESTURL(ENV.REST_PATH + '/llm', { app: 'QueryTester', owner: 'admin' }) +
            '?output_mode=json';
        const defaults = getDefaultFetchInit();
        init = {
            ...defaults,
            method: 'POST',
            headers: { ...defaults.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userMessage }),
        };
    } else {
        url = ENV.FALLBACK_ENDPOINT + '/llm?output_mode=json';
        init = {
            method: 'POST',
            credentials: 'include' as RequestCredentials,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userMessage }),
        };
    }

    const res = await fetch(url, init);
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error('LLM request failed (' + res.status + '): ' + errText.slice(0, 200));
    }

    const data = await res.json();
    // Splunk REST wraps in entry[0].content, but our handler returns plain JSON
    const content = data?.content || data?.entry?.[0]?.content?.content;
    if (!content) {
        throw new Error('Empty response from LLM proxy');
    }
    return content;
}

/**
 * Extract data sources and their input fields from SPL.
 */
export async function extractDataSources(spl: string): Promise<ExtractedDataSource[]> {
    const raw = await callLLM(EXTRACT_DATA_SOURCES_PROMPT, spl);
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
    const raw = await callLLM(EXTRACT_VALIDATION_FIELDS_PROMPT, spl);
    const cleaned = cleanJsonResponse(raw);

    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed.map(String);
        throw new Error('not array');
    } catch {
        if (cleaned.includes(',')) {
            return cleaned
                .split(',')
                .map((s) => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
        }
        throw new Error('Failed to parse LLM response: ' + cleaned.slice(0, 100));
    }
}

// ── Analyze Query ────────────────────────────────────────────────────────────────

export interface AnalyzeQueryNote {
    token: string;
    occurrence: number;
    message: string;
    category: string;
}

export interface AnalyzeQueryResult {
    explanation: string;
    fields: string[];
    notes: AnalyzeQueryNote[];
    summary: string;
}

/**
 * Send SPL to the LLM for code review, explanation, and field tracking.
 */
export async function analyzeQuery(spl: string): Promise<AnalyzeQueryResult> {
    const raw = await callLLM(ANALYZE_QUERY_PROMPT, spl);
    const cleaned = cleanJsonResponse(raw);

    let parsed: AnalyzeQueryResult;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error('Failed to parse LLM analysis response: ' + cleaned.slice(0, 100));
    }

    return {
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
        fields: Array.isArray(parsed.fields) ? parsed.fields.map(String) : [],
        notes: Array.isArray(parsed.notes)
            ? parsed.notes.map((n) => ({
                  token: String(n.token || ''),
                  occurrence: typeof n.occurrence === 'number' ? n.occurrence : 1,
                  message: String(n.message || ''),
                  category: String(n.category || 'best_practice'),
              }))
            : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
}
