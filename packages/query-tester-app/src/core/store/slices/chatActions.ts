/**
 * chatActions — Action implementations for the chat slice.
 * Extracted to keep chatSlice.ts under 200 lines.
 */
import type { ChatMessage } from '../../../api/llmApi';
import type { IdeRunResponse } from '../../../api/ideApi';
import { callLLMChat } from '../../../api/llmApi';
import { runIdeQuery } from '../../../api/ideApi';
import { buildChatSystemPrompt } from '../../../api/chatPrompts';
import type { ChatContextData } from '../../../api/chatPrompts';
import { parseActionBlocks } from '../../../features/ide/chatUtils';
import { runAgentPipeline } from '../../../features/ide/agentLoop';
import type { AgentPipelineConfig } from '../../../features/ide/agentLoop';
import type { ChatMessageEntry, ChatSliceState, AgentRole } from './chatSlice';

interface ChatStoreGet {
    (): {
        tests: Array<{ id: string; query?: { spl?: string; timeRange?: { earliest: string; latest: string } }; app?: string }>;
        activeTestId: string | null;
        ideUserContext: string;
        ideResponse: IdeRunResponse | null;
        chatMessages: ChatMessageEntry[];
        chatSampleData: Record<string, string>[] | null;
        chatPreviousResponse: IdeRunResponse | null;
        chatCustomPrompt: string;
        chatSkills: Array<{ id: string; name: string; prompt: string; enabled: boolean; role: AgentRole; isSystemPrompt: boolean }>;
        updateSpl: (testId: string, spl: string) => void;
        runIdeQuery: (spl: string, app: string, timeRange?: { earliest: string; latest: string }) => Promise<void>;
    };
}
type SetState = (recipe: (draft: ChatSliceState) => void) => void;
let chatAbortController: AbortController | null = null;

export function abortChat(): void {
    if (chatAbortController) { chatAbortController.abort(); chatAbortController = null; }
}

function buildContext(
    resp: IdeRunResponse | null, sample: Record<string, string>[] | null, prev: IdeRunResponse | null,
): ChatContextData {
    const prevRows = prev?.resultRows || null;
    const prevCount = prev?.resultCount ?? null;
    if (resp?.status === 'success') {
        return { sampleRows: sample, queryRows: resp.resultRows || [], queryError: null,
            queryResultCount: resp.resultCount, previousQueryRows: prevRows, previousQueryCount: prevCount };
    }
    if (resp?.status === 'error') {
        return { sampleRows: sample, queryRows: [], queryError: resp.message || 'Query error',
            queryResultCount: null, previousQueryRows: prevRows, previousQueryCount: prevCount };
    }
    return { sampleRows: sample, queryRows: null, queryError: null,
        queryResultCount: null, previousQueryRows: null, previousQueryCount: null };
}

function buildAgentConfig(
    skills: Array<{ name: string; prompt: string; enabled: boolean; role: AgentRole; isSystemPrompt: boolean }>,
): AgentPipelineConfig | null {
    const roles: AgentRole[] = ['manager', 'explainer', 'writer', 'validator'];
    const config: Partial<AgentPipelineConfig> = {};
    for (const role of roles) {
        const rs = skills.filter((s) => s.role === role);
        const sys = rs.find((s) => s.isSystemPrompt && s.prompt.trim());
        if (!sys) return null;
        config[role] = {
            systemPrompt: sys.prompt,
            skills: rs.filter((s) => !s.isSystemPrompt && s.enabled && s.prompt.trim())
                .map((s) => ({ name: s.name, prompt: s.prompt })),
        };
    }
    return config as AgentPipelineConfig;
}

function makeEntry(role: 'user' | 'assistant', content: string, extra?: Partial<ChatMessageEntry>): ChatMessageEntry {
    return { id: crypto.randomUUID(), role, content, timestamp: Date.now(), ...extra };
}

export function createSendChatMessage(set: SetState, get: ChatStoreGet): (text: string) => Promise<void> {
    return async (text: string) => {
        const state = get();
        const test = state.tests.find((t) => t.id === state.activeTestId);
        if (!test) return;
        const spl = test.query?.spl ?? '';
        const app = test.app ?? '';
        const timeRange = test.query?.timeRange;

        set((d) => { d.chatMessages.push(makeEntry('user', text)); d.chatLoading = true; d.chatAgentSteps = []; });

        const cur = get();
        const ctx = buildContext(state.ideResponse, cur.chatSampleData, cur.chatPreviousResponse);
        const history: ChatMessage[] = cur.chatMessages.map((m) => ({ role: m.role, content: m.content }));
        if (chatAbortController) chatAbortController.abort();
        chatAbortController = new AbortController();
        const signal = chatAbortController.signal;
        const agentConfig = buildAgentConfig(state.chatSkills);

        try {
            let entry: ChatMessageEntry;
            if (agentConfig) {
                const exec = (q: string) => runIdeQuery(app, q, timeRange);
                const r = await runAgentPipeline(agentConfig, text, spl, app, timeRange, ctx, history, exec,
                    (step) => {
                        set((d) => {
                            const idx = d.chatAgentSteps.findIndex((s) => s.id === step.id);
                            if (idx >= 0) {
                                d.chatAgentSteps[idx] = step;
                            } else {
                                d.chatAgentSteps.push(step);
                            }
                        });
                    }, signal);
                entry = makeEntry('assistant', r.content, {
                    actions: r.actions.length > 0 ? r.actions : undefined,
                    agentSteps: r.steps.length > 0 ? r.steps : undefined,
                });
            } else {
                const sk = state.chatSkills.filter((s) => s.enabled).map((s) => ({ name: s.name, prompt: s.prompt }));
                const sys = buildChatSystemPrompt(spl, app, timeRange, state.ideUserContext, ctx, state.chatCustomPrompt, sk);
                const raw = await callLLMChat(sys, history);
                const { cleanContent, actions } = parseActionBlocks(raw);
                entry = makeEntry('assistant', cleanContent, { actions: actions.length > 0 ? actions : undefined });
            }
            set((d) => { d.chatMessages.push(entry); d.chatLoading = false; });
        } catch (e) {
            const err = e as { name?: string; message?: string };
            if (err.name === 'AbortError') { set((d) => { d.chatLoading = false; }); return; }
            set((d) => { d.chatMessages.push(makeEntry('assistant', 'Error: ' + (err.message || 'Chat request failed'))); d.chatLoading = false; });
        } finally { chatAbortController = null; }
    };
}

export function createExecuteChatAction(set: SetState, get: ChatStoreGet): (messageId: string, actionId: string) => Promise<void> {
    return async (messageId: string, actionId: string) => {
        const state = get();
        const msg = state.chatMessages.find((m) => m.id === messageId);
        const action = msg?.actions?.find((a) => a.id === actionId);
        if (!msg || !action) return;

        const test = state.tests.find((t) => t.id === state.activeTestId);
        if (!test) return;

        if (action.type === 'update_spl') {
            const currentResponse = state.ideResponse;
            if (currentResponse && currentResponse.status === 'success') {
                set((d) => { d.chatPreviousResponse = currentResponse; });
            }

            state.updateSpl(test.id, action.payload);
            set((d) => {
                const target = d.chatMessages.find((m) => m.id === messageId);
                if (target) {
                    if (!target.actionResults) target.actionResults = {};
                    target.actionResults[actionId] = { status: 'success' };
                }
            });

            const tr = test.query?.timeRange;
            void state.runIdeQuery(
                action.payload, test.app ?? '',
                tr ? { earliest: tr.earliest || '0', latest: tr.latest || 'now' } : undefined,
            );
            return;
        }

        // run_query
        set((d) => {
            const target = d.chatMessages.find((m) => m.id === messageId);
            if (target) {
                if (!target.actionResults) target.actionResults = {};
                target.actionResults[actionId] = { status: 'loading' };
            }
        });

        try {
            const resp = await runIdeQuery(test.app ?? '', action.payload, test.query?.timeRange);
            set((d) => {
                const target = d.chatMessages.find((m) => m.id === messageId);
                if (target?.actionResults) {
                    target.actionResults[actionId] = { status: 'success', rows: resp.resultRows || [] };
                }
            });
        } catch (e) {
            const err = e as { message?: string };
            set((d) => {
                const target = d.chatMessages.find((m) => m.id === messageId);
                if (target?.actionResults) {
                    target.actionResults[actionId] = { status: 'error', error: err.message || 'Query failed' };
                }
            });
        }
    };
}
