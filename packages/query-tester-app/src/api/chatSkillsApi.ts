/**
 * chatSkillsApi.ts — CRUD for chat skills stored in KVStore.
 */
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../config/env';
import type { ChatSkill } from '../core/store/slices/chatSlice';

const SUB_PATH = '/chat_skills';

function isSplunkEnv(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typeof window !== 'undefined' && !!(window as any).$C;
    } catch { return false; }
}

function buildUrl(): string {
    if (isSplunkEnv()) {
        return createRESTURL(ENV.REST_PATH + SUB_PATH, { app: 'QueryTester', owner: 'admin' }) + '?output_mode=json';
    }
    return ENV.FALLBACK_ENDPOINT + SUB_PATH + '?output_mode=json';
}

function buildInit(method: string, body?: Record<string, unknown>): RequestInit {
    if (isSplunkEnv()) {
        const defaults = getDefaultFetchInit();
        return {
            method,
            credentials: defaults.credentials as RequestCredentials,
            headers: { ...(defaults.headers as Record<string, string>), 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        };
    }
    return {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...(body ? { body: JSON.stringify(body) } : {}),
    };
}

export async function fetchChatSkills(): Promise<ChatSkill[]> {
    const resp = await fetch(buildUrl(), buildInit('GET'));
    if (!resp.ok) throw new Error('Failed to load skills');
    const data = await resp.json();
    const entries = data.entry ? data.entry.map((e: Record<string, unknown>) => e.content) : data;
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeChatSkill);
}

export async function createChatSkill(skill: Omit<ChatSkill, 'id'>): Promise<ChatSkill> {
    const resp = await fetch(buildUrl(), buildInit('POST', {
        name: skill.name, prompt: skill.prompt, enabled: skill.enabled,
    }));
    if (!resp.ok) throw new Error('Failed to create skill');
    const data = await resp.json();
    const content = data.entry ? data.entry[0].content : data;
    return normalizeChatSkill(content);
}

export async function updateChatSkill(skill: ChatSkill): Promise<ChatSkill> {
    const resp = await fetch(buildUrl(), buildInit('PUT', {
        id: skill.id, name: skill.name, prompt: skill.prompt,
        enabled: skill.enabled, sortOrder: skill.enabled ? 0 : 999,
    }));
    if (!resp.ok) throw new Error('Failed to update skill');
    const data = await resp.json();
    const content = data.entry ? data.entry[0].content : data;
    return normalizeChatSkill(content);
}

export async function deleteChatSkill(id: string): Promise<void> {
    const resp = await fetch(buildUrl(), buildInit('DELETE', { id }));
    if (!resp.ok) throw new Error('Failed to delete skill');
}

function normalizeChatSkill(raw: Record<string, unknown>): ChatSkill {
    const enabled = raw.enabled;
    return {
        id: String(raw.id || ''),
        name: String(raw.name || ''),
        prompt: String(raw.prompt || ''),
        enabled: enabled === true || enabled === '1' || enabled === 'true',
    };
}
