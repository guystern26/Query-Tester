/**
 * agentLoop.ts — Multi-agent pipeline orchestration.
 * Manager → Specialist → (auto-query loop) → Validator → response.
 */
import type { ChatMessage } from '../../api/llmApi';
import { callLLMChat } from '../../api/llmApi';
import type { ChatContextData } from '../../api/chatPrompts';
import type { IdeRunResponse } from '../../api/ideApi';
import type { ParsedAction } from './chatUtils';
import { parseActionBlocks } from './chatUtils';
import { buildManagerRoutingPrompt, buildSpecialistPrompt, buildValidatorPrompt } from './agentPrompts';
import { runDebugPipeline } from './debugPipeline';

export interface AgentStep {
    id: string;
    type: 'auto_query' | 'debug_step' | 'validation' | 'routing';
    spl?: string;
    status: 'running' | 'success' | 'error' | 'blocked';
    rows?: Record<string, string>[];
    error?: string;
    resultCount?: number;
    label?: string;
}

export interface AgentRoleConfig {
    systemPrompt: string;
    skills: Array<{ name: string; prompt: string }>;
}

export interface AgentPipelineConfig {
    manager: AgentRoleConfig;
    explainer: AgentRoleConfig;
    writer: AgentRoleConfig;
    validator: AgentRoleConfig;
}

const MAX_AGENT_ITERATIONS = 8;
const MAX_VALIDATOR_RETRIES = 2;
const MANUAL_TYPES = ['run_query', 'update_spl'];

function checkAbort(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
}

function fmtRows(rows: Record<string, string>[], count: number): string {
    if (rows.length === 0) return '(0 results)';
    const keys = Object.keys(rows[0]);
    const hdr = '| ' + keys.join(' | ') + ' |';
    const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
    const body = rows.slice(0, 5)
        .map((r) => '| ' + keys.map((k) => String(r[k] ?? '').slice(0, 60)).join(' | ') + ' |').join('\n');
    return count + ' total results:\n' + hdr + '\n' + sep + '\n' + body;
}

function parseJsonBlock(raw: string): Record<string, unknown> {
    return JSON.parse(raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());
}

async function routeViaManager(
    config: AgentPipelineConfig, userMessage: string, spl: string,
    app: string, timeRange: { earliest: string; latest: string } | undefined,
    onStep: (step: AgentStep) => void, steps: AgentStep[],
): Promise<'explainer' | 'writer'> {
    const routeStep: AgentStep = {
        id: 'route-' + steps.length, type: 'routing', status: 'running', label: 'Routing to specialist',
    };
    steps.push(routeStep);
    onStep(routeStep);

    const specialists = { explainer: config.explainer, writer: config.writer };
    const prompt = buildManagerRoutingPrompt(config.manager, spl, app, timeRange, specialists, userMessage);
    try {
        const raw = await callLLMChat(prompt, [{ role: 'user', content: userMessage }]);
        const name = String((parseJsonBlock(raw) as { specialist?: string }).specialist || '').toLowerCase();
        if (name === 'explainer' || name === 'writer') {
            const upd = { ...routeStep, status: 'success' as const, label: 'Routed to ' + name };
            steps[steps.length - 1] = upd;
            onStep(upd);
            return name;
        }
    } catch (e) {
        const err = e as { message?: string };
        const upd = {
            ...routeStep, status: 'error' as const,
            label: 'Routing failed, defaulting to explainer',
            error: 'LLM call failed: ' + (err.message || 'unknown error') + '. Check your LLM settings in the Setup page.',
        };
        steps[steps.length - 1] = upd;
        onStep(upd);
    }
    return 'explainer';
}

async function executeAutoQueries(
    queries: ParsedAction[], spl: string, iterations: number,
    executeQuery: (q: string) => Promise<IdeRunResponse>,
    onStep: (step: AgentStep) => void, signal: AbortSignal, steps: AgentStep[],
    hasDebug: boolean,
): Promise<string[]> {
    const results: string[] = [];
    for (const aq of queries) {
        checkAbort(signal);
        const step: AgentStep = {
            id: 'auto-' + iterations + '-' + steps.length, type: 'auto_query',
            spl: aq.payload, status: 'running', label: 'Auto-query ' + iterations,
        };
        steps.push(step);
        onStep(step);
        try {
            const resp = await executeQuery(aq.payload);
            const rows = resp.resultRows || [];
            const upd = { ...step, status: 'success' as const, rows, resultCount: resp.resultCount };
            steps[steps.length - 1] = upd;
            onStep(upd);
            results.push('Query: `' + aq.payload.slice(0, 120) + '`\n' + fmtRows(rows, resp.resultCount));
        } catch (e) {
            const err = e as { message?: string };
            const upd = { ...step, status: 'error' as const, error: err.message };
            steps[steps.length - 1] = upd;
            onStep(upd);
            results.push('Query: `' + aq.payload.slice(0, 120) + '`\nERROR: ' + (err.message || 'failed'));
        }
    }
    if (hasDebug) {
        checkAbort(signal);
        results.push(await runDebugPipeline(spl, executeQuery, (s) => { steps.push(s); onStep(s); }, signal));
    }
    return results;
}

async function runSpecialist(
    cfg: AgentRoleConfig, spl: string, app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    ctx: ChatContextData, history: ChatMessage[],
    exec: (q: string) => Promise<IdeRunResponse>,
    onStep: (step: AgentStep) => void, signal: AbortSignal,
    steps: AgentStep[], feedback?: string,
): Promise<{ content: string; actions: ParsedAction[] }> {
    const sys = buildSpecialistPrompt(cfg, spl, app, timeRange, ctx);
    const aug = [...history];
    if (feedback) aug.push({ role: 'user', content: '[Validator feedback]: ' + feedback });

    for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
        checkAbort(signal);
        let raw: string;
        try {
            raw = await callLLMChat(sys, aug);
        } catch (e) {
            const err = e as { message?: string };
            throw new Error('LLM call failed: ' + (err.message || 'unknown error') + '. Check your LLM settings in the Setup page.');
        }
        const { cleanContent, actions } = parseActionBlocks(raw);
        const autos = actions.filter((a) => a.type === 'auto_query');
        const hasDebug = actions.some((a) => a.type === 'debug_pipeline');
        if (autos.length === 0 && !hasDebug) {
            return { content: cleanContent, actions: actions.filter((a) => MANUAL_TYPES.includes(a.type)) };
        }
        const results = await executeAutoQueries(autos, spl, i + 1, exec, onStep, signal, steps, hasDebug);
        aug.push({ role: 'assistant', content: raw });
        aug.push({ role: 'user', content: '[Auto-query results]:\n\n' + results.join('\n\n') });
    }
    let finalRaw: string;
    try {
        finalRaw = await callLLMChat(sys, aug);
    } catch (e) {
        const err = e as { message?: string };
        throw new Error('LLM call failed: ' + (err.message || 'unknown error') + '. Check your LLM settings in the Setup page.');
    }
    const final = parseActionBlocks(finalRaw);
    return { content: final.cleanContent, actions: final.actions.filter((a) => MANUAL_TYPES.includes(a.type)) };
}

async function runValidator(
    config: AgentPipelineConfig, userReq: string, response: string,
    spl: string, app: string, onStep: (step: AgentStep) => void, steps: AgentStep[],
): Promise<{ valid: boolean; feedback: string }> {
    const step: AgentStep = {
        id: 'validate-' + steps.length, type: 'validation', status: 'running', label: 'Validating response',
    };
    steps.push(step);
    onStep(step);
    const prompt = buildValidatorPrompt(config.validator, userReq, response, spl, app);
    try {
        const raw = await callLLMChat(prompt, [{ role: 'user', content: 'Validate the specialist response.' }]);
        const parsed = parseJsonBlock(raw);
        const valid = parsed.valid === true;
        const fb = String(parsed.feedback || '');
        steps[steps.length - 1] = { ...step, status: valid ? 'success' : 'blocked' };
        onStep(steps[steps.length - 1]);
        return { valid, feedback: fb };
    } catch {
        steps[steps.length - 1] = { ...step, status: 'success' };
        onStep(steps[steps.length - 1]);
        return { valid: true, feedback: '' };
    }
}

/** Main agent pipeline entry point. */
export async function runAgentPipeline(
    config: AgentPipelineConfig, userMessage: string, spl: string, app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    contextData: ChatContextData, history: ChatMessage[],
    executeQuery: (q: string) => Promise<IdeRunResponse>,
    onStep: (step: AgentStep) => void, signal: AbortSignal,
): Promise<{ content: string; actions: ParsedAction[]; steps: AgentStep[] }> {
    const steps: AgentStep[] = [];
    checkAbort(signal);
    const specialist = await routeViaManager(config, userMessage, spl, app, timeRange, onStep, steps);
    const specialistCfg = specialist === 'writer' ? config.writer : config.explainer;

    let lastContent = '';
    let lastActions: ParsedAction[] = [];
    let feedback: string | undefined;

    for (let retry = 0; retry <= MAX_VALIDATOR_RETRIES; retry++) {
        checkAbort(signal);
        const result = await runSpecialist(
            specialistCfg, spl, app, timeRange, contextData, history, executeQuery, onStep, signal, steps, feedback,
        );
        lastContent = result.content;
        lastActions = result.actions;
        checkAbort(signal);
        const v = await runValidator(config, userMessage, lastContent, spl, app, onStep, steps);
        if (v.valid) break;
        feedback = v.feedback;
    }
    return { content: lastContent, actions: lastActions, steps };
}
