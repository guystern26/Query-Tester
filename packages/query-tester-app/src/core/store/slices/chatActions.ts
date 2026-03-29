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
import type { ChatMessageEntry, ChatSliceState } from './chatSlice';

interface ChatStoreGet {
    (): {
        tests: Array<{ id: string; query?: { spl?: string; timeRange?: { earliest: string; latest: string } }; app?: string }>;
        activeTestId: string | null;
        ideUserContext: string;
        ideResponse: IdeRunResponse | null;
        chatMessages: ChatMessageEntry[];
        chatSampleData: Record<string, string>[] | null;
        chatPreviousResponse: IdeRunResponse | null;
        updateSpl: (testId: string, spl: string) => void;
        runIdeQuery: (spl: string, app: string, timeRange?: { earliest: string; latest: string }) => Promise<void>;
    };
}

type SetState = (recipe: (draft: ChatSliceState) => void) => void;

let chatAbortController: AbortController | null = null;

export function abortChat(): void {
    if (chatAbortController) {
        chatAbortController.abort();
        chatAbortController = null;
    }
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

export function createSendChatMessage(set: SetState, get: ChatStoreGet): (text: string) => Promise<void> {
    return async (text: string) => {
        const state = get();
        const test = state.tests.find((t) => t.id === state.activeTestId);
        if (!test) return;

        const spl = test.query?.spl ?? '';
        const app = test.app ?? '';
        const ideResponse = state.ideResponse;

        const userEntry: ChatMessageEntry = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };

        set((d) => {
            d.chatMessages.push(userEntry);
            d.chatLoading = true;
        });

        const currentState = get();
        const contextData = buildContext(ideResponse, currentState.chatSampleData, currentState.chatPreviousResponse);

        const history: ChatMessage[] = currentState.chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        const systemPrompt = buildChatSystemPrompt(
            spl, app, test.query?.timeRange, state.ideUserContext, contextData,
        );

        if (chatAbortController) chatAbortController.abort();
        chatAbortController = new AbortController();

        try {
            const rawResponse = await callLLMChat(systemPrompt, history);
            const { cleanContent, actions } = parseActionBlocks(rawResponse);

            const assistantEntry: ChatMessageEntry = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: cleanContent,
                timestamp: Date.now(),
                actions: actions.length > 0 ? actions : undefined,
                actionResults: undefined,
            };

            set((d) => {
                d.chatMessages.push(assistantEntry);
                d.chatLoading = false;
            });
        } catch (e) {
            const err = e as { name?: string; message?: string };
            if (err.name === 'AbortError') {
                set((d) => { d.chatLoading = false; });
                return;
            }
            const errorEntry: ChatMessageEntry = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Error: ' + (err.message || 'Chat request failed'),
                timestamp: Date.now(),
            };
            set((d) => {
                d.chatMessages.push(errorEntry);
                d.chatLoading = false;
            });
        } finally {
            chatAbortController = null;
        }
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
