/**
 * chatSlice — Multi-turn AI chat state and actions for the IDE.
 * Context comes from the existing IDE query run (ideResponse) — the chat
 * never fires its own full-query execution. When the user runs a query via
 * the results bar, ideResponse updates and the chat picks up the new data
 * on the next message automatically.
 */

import type { IdeRunResponse } from '../../../api/ideApi';
import { runIdeQuery } from '../../../api/ideApi';
import { extractBaseSearch } from '../../../features/ide/chatUtils';
import type { ParsedAction } from '../../../features/ide/chatUtils';
import type { AgentStep } from '../../../features/ide/agentLoop';
import { abortChat, createSendChatMessage, createExecuteChatAction } from './chatActions';
import { fetchChatSkills, createChatSkill, updateChatSkill, deleteChatSkill } from '../../../api/chatSkillsApi';

export type AgentRole = 'manager' | 'explainer' | 'writer' | 'validator';

export interface ChatSkill {
    id: string;
    name: string;
    prompt: string;
    enabled: boolean;
    role: AgentRole;
    isSystemPrompt: boolean;
}

export interface ActionResult {
    status: 'loading' | 'success' | 'error';
    rows?: Record<string, string>[];
    error?: string;
}

export interface ChatMessageEntry {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    actions?: ParsedAction[];
    actionResults?: Record<string, ActionResult>;
    agentSteps?: AgentStep[];
}

export interface ChatSliceState {
    chatMessages: ChatMessageEntry[];
    chatLoading: boolean;
    chatSampleData: Record<string, string>[] | null;
    chatSampleLoading: boolean;
    chatContextSpl: string | null;
    chatExpanded: boolean;
    chatPreviousResponse: IdeRunResponse | null;
    chatCustomPrompt: string;
    chatSkills: ChatSkill[];
    chatAgentSteps: AgentStep[];
    sendChatMessage: (text: string) => Promise<void>;
    syncChatContext: (response: IdeRunResponse, spl: string) => void;
    executeChatAction: (messageId: string, actionId: string) => Promise<void>;
    clearChat: () => void;
    toggleChatExpanded: () => void;
    setChatCustomPrompt: (prompt: string) => void;
    setChatSkills: (skills: ChatSkill[]) => void;
    loadChatSkills: () => Promise<void>;
    addChatSkill: (name: string, prompt: string, role?: AgentRole, isSystemPrompt?: boolean) => Promise<void>;
    saveChatSkill: (skill: ChatSkill) => Promise<void>;
    removeChatSkill: (id: string) => Promise<void>;
}

const CUSTOM_PROMPT_KEY = 'qt_chat_custom_prompt';
function loadCustomPrompt(): string {
    try { return localStorage.getItem(CUSTOM_PROMPT_KEY) || ''; } catch { return ''; }
}

export const chatInitialState: Pick<
    ChatSliceState,
    | 'chatMessages' | 'chatLoading' | 'chatSampleData' | 'chatSampleLoading'
    | 'chatContextSpl' | 'chatExpanded' | 'chatPreviousResponse' | 'chatCustomPrompt'
    | 'chatSkills' | 'chatAgentSteps'
> = {
    chatMessages: [],
    chatLoading: false,
    chatSampleData: null,
    chatSampleLoading: false,
    chatContextSpl: null,
    chatExpanded: false,
    chatPreviousResponse: null,
    chatCustomPrompt: loadCustomPrompt(),
    chatSkills: [],
    chatAgentSteps: [],
};

interface StoreGet {
    (): {
        tests: Array<{ id: string; query?: { spl?: string; timeRange?: { earliest: string; latest: string } }; app?: string }>;
        activeTestId: string | null;
        ideUserContext: string;
        ideResponse: IdeRunResponse | null;
        chatMessages: ChatMessageEntry[];
        chatSampleData: Record<string, string>[] | null;
        chatSampleLoading: boolean;
        chatContextSpl: string | null;
        chatPreviousResponse: IdeRunResponse | null;
        chatCustomPrompt: string;
        chatSkills: ChatSkill[];
        chatAgentSteps: AgentStep[];
        updateSpl: (testId: string, spl: string) => void;
        runIdeQuery: (spl: string, app: string, timeRange?: { earliest: string; latest: string }, userContext?: string, priorAnalysis?: Array<{ severity: string; category: string; message: string }>, allowBlocked?: boolean) => Promise<void>;
    };
}

type SetState = (recipe: (draft: ChatSliceState) => void) => void;

export function chatSlice(
    set: SetState,
    get: StoreGet,
): Pick<ChatSliceState, 'sendChatMessage' | 'syncChatContext' | 'executeChatAction' | 'clearChat' | 'toggleChatExpanded' | 'setChatCustomPrompt' | 'setChatSkills' | 'loadChatSkills' | 'addChatSkill' | 'saveChatSkill' | 'removeChatSkill'> {
    return {
        toggleChatExpanded: () => {
            set((d) => { d.chatExpanded = !d.chatExpanded; });
        },

        setChatCustomPrompt: (prompt: string) => {
            set((d) => { d.chatCustomPrompt = prompt; });
            try { localStorage.setItem(CUSTOM_PROMPT_KEY, prompt); } catch { /* ignore */ }
        },

        setChatSkills: (skills: ChatSkill[]) => {
            set((d) => { d.chatSkills = skills; });
        },

        loadChatSkills: async () => {
            try {
                const skills = await fetchChatSkills();
                set((d) => { d.chatSkills = skills; });
            } catch { /* skills stay empty until backend is available */ }
        },

        addChatSkill: async (name: string, prompt: string, role?: AgentRole, isSystemPrompt?: boolean) => {
            try {
                const skill = await createChatSkill({
                    name, prompt, enabled: true,
                    role: role || 'manager', isSystemPrompt: isSystemPrompt || false,
                });
                set((d) => { d.chatSkills.push(skill); });
            } catch { /* ignore — UI will still show local state */ }
        },

        saveChatSkill: async (skill: ChatSkill) => {
            set((d) => {
                const idx = d.chatSkills.findIndex((s) => s.id === skill.id);
                if (idx >= 0) d.chatSkills[idx] = skill;
            });
            try { await updateChatSkill(skill); } catch { /* local state already updated */ }
        },

        removeChatSkill: async (id: string) => {
            set((d) => { d.chatSkills = d.chatSkills.filter((s) => s.id !== id); });
            try { await deleteChatSkill(id); } catch { /* local state already updated */ }
        },

        syncChatContext: (response: IdeRunResponse, spl: string) => {
            set((d) => { d.chatContextSpl = spl; });

            const baseSpl = extractBaseSearch(spl);
            const hasAggregation = baseSpl !== spl.trim();

            if (hasAggregation) {
                set((d) => { d.chatSampleLoading = true; });
                const state = get();
                const test = state.tests.find((t) => t.id === state.activeTestId);
                const app = test?.app ?? '';
                const timeRange = test?.query?.timeRange;

                runIdeQuery(app, baseSpl + ' | head 3', timeRange)
                    .then((resp) => {
                        set((d) => {
                            d.chatSampleData = resp.resultRows || [];
                            d.chatSampleLoading = false;
                        });
                    })
                    .catch(() => {
                        set((d) => {
                            d.chatSampleData = [];
                            d.chatSampleLoading = false;
                        });
                    });
            } else {
                set((d) => {
                    d.chatSampleData = (response.resultRows || []).slice(0, 3);
                    d.chatSampleLoading = false;
                });
            }
        },

        sendChatMessage: createSendChatMessage(set, get),
        executeChatAction: createExecuteChatAction(set, get),

        clearChat: () => {
            abortChat();
            set((d) => {
                d.chatMessages = [];
                d.chatLoading = false;
                d.chatSampleData = null;
                d.chatSampleLoading = false;
                d.chatContextSpl = null;
                d.chatPreviousResponse = null;
                d.chatAgentSteps = [];
            });
        },
    };
}
