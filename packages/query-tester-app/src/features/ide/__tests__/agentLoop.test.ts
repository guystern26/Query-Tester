/**
 * Tests for agentLoop — multi-agent pipeline orchestration.
 * Mocks callLLMChat to simulate manager routing, specialist responses,
 * auto-query loops, and validator pass/fail/retry.
 */
import { runAgentPipeline } from '../agentLoop';
import type { AgentPipelineConfig, AgentStep } from '../agentLoop';
import type { ChatContextData } from '../../../api/chatPrompts';
import type { IdeRunResponse } from '../../../api/ideApi';

// Mock the LLM API
jest.mock('../../../api/llmApi', () => ({
    callLLMChat: jest.fn(),
}));
import { callLLMChat } from '../../../api/llmApi';
const mockedLLM = callLLMChat as jest.MockedFunction<typeof callLLMChat>;

function makeConfig(): AgentPipelineConfig {
    return {
        manager: { systemPrompt: 'You are a manager. Route to the right specialist.', skills: [] },
        explainer: { systemPrompt: 'You are an explainer. Explain SPL.', skills: [] },
        writer: { systemPrompt: 'You are a writer. Write SPL.', skills: [] },
        validator: { systemPrompt: 'You are a validator. Check responses.', skills: [] },
    };
}

function makeContext(): ChatContextData {
    return {
        sampleRows: null, queryRows: null, queryError: null,
        queryResultCount: null, previousQueryRows: null, previousQueryCount: null,
    };
}

function makeExec(rows?: Record<string, string>[]): (q: string) => Promise<IdeRunResponse> {
    return jest.fn().mockResolvedValue({
        status: 'success',
        resultRows: rows || [{ count: '42' }],
        resultCount: rows ? rows.length : 1,
        executionTimeMs: 50,
        splAnalysis: { unauthorizedCommands: [], unusualCommands: [], uniqLimitations: null, commandsUsed: [], warnings: [] },
        aiNotes: [], warnings: [], errors: [],
    } as IdeRunResponse);
}

describe('runAgentPipeline', () => {
    beforeEach(() => {
        mockedLLM.mockReset();
    });

    it('routes through manager → explainer → validator (happy path)', async () => {
        // Call 1: Manager routes to explainer
        mockedLLM.mockResolvedValueOnce('{"specialist": "explainer"}');
        // Call 2: Explainer response (no auto-query actions)
        mockedLLM.mockResolvedValueOnce('This query searches the main index and counts events.');
        // Call 3: Validator passes
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const steps: AgentStep[] = [];
        const result = await runAgentPipeline(
            makeConfig(), 'What does this query do?',
            'index=main | stats count', 'search', undefined,
            makeContext(), [], makeExec(),
            (step) => steps.push(step),
            new AbortController().signal,
        );

        expect(result.content).toBe('This query searches the main index and counts events.');
        expect(result.actions).toEqual([]);
        expect(mockedLLM).toHaveBeenCalledTimes(3);
        // Validator step: 1 running + 1 success = 2 onStep calls
        const validationSteps = steps.filter((s) => s.type === 'validation');
        expect(validationSteps.length).toBe(2);
        expect(validationSteps[0].status).toBe('running');
        expect(validationSteps[1].status).toBe('success');
    });

    it('routes to writer when manager says so', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "writer"}');
        mockedLLM.mockResolvedValueOnce('Here is an optimized query.\n~~~action:update_spl\nindex=main | stats dc(src_ip)\n~~~');
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const result = await runAgentPipeline(
            makeConfig(), 'Optimize this',
            'index=main | stats count by src_ip', 'search', undefined,
            makeContext(), [], makeExec(),
            () => {},
            new AbortController().signal,
        );

        expect(result.content).toBe('Here is an optimized query.');
        expect(result.actions.length).toBe(1);
        expect(result.actions[0].type).toBe('update_spl');
        expect(result.actions[0].payload).toBe('index=main | stats dc(src_ip)');
    });

    it('defaults to explainer on invalid manager response', async () => {
        mockedLLM.mockResolvedValueOnce('I am not sure, maybe explainer?'); // Not valid JSON
        mockedLLM.mockResolvedValueOnce('Let me explain this query.');
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const result = await runAgentPipeline(
            makeConfig(), 'What does this do?',
            'index=main', 'search', undefined,
            makeContext(), [], makeExec(),
            () => {},
            new AbortController().signal,
        );

        expect(result.content).toBe('Let me explain this query.');
    });

    it('executes auto_query actions and feeds results back', async () => {
        const exec = makeExec([{ sourcetype: 'access_combined', count: '1500' }]);

        mockedLLM.mockResolvedValueOnce('{"specialist": "writer"}');
        // First specialist call: emits auto_query
        mockedLLM.mockResolvedValueOnce(
            'Let me check what sourcetypes are available.\n' +
            '~~~action:auto_query\nindex=main | stats count by sourcetype | head 5\n~~~',
        );
        // Second specialist call (after auto-query results): final answer
        mockedLLM.mockResolvedValueOnce(
            'Based on the data, you have access_combined with 1500 events.',
        );
        // Validator passes
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const steps: AgentStep[] = [];
        const result = await runAgentPipeline(
            makeConfig(), 'What data do I have?',
            'index=main', 'search', undefined,
            makeContext(), [], exec,
            (step) => steps.push(step),
            new AbortController().signal,
        );

        expect(exec).toHaveBeenCalledTimes(1);
        expect((exec as jest.Mock).mock.calls[0][0]).toBe('index=main | stats count by sourcetype | head 5');
        expect(result.content).toBe('Based on the data, you have access_combined with 1500 events.');
        // Should have auto-query steps
        const autoSteps = steps.filter((s) => s.type === 'auto_query');
        expect(autoSteps.length).toBeGreaterThanOrEqual(1);
    });

    it('blocks dangerous commands in auto_query', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "writer"}');
        // Specialist tries to emit a dangerous auto_query
        mockedLLM.mockResolvedValueOnce(
            'Cleaning up.\n~~~action:auto_query\n| delete index=main\n~~~',
        );
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const exec = makeExec();
        const result = await runAgentPipeline(
            makeConfig(), 'Clean up',
            'index=main', 'search', undefined,
            makeContext(), [], exec,
            () => {},
            new AbortController().signal,
        );

        // Dangerous auto_query should be blocked (parsed out), no query executed
        expect(exec).not.toHaveBeenCalled();
        expect(result.content).toContain('Blocked');
    });

    it('retries specialist on validator failure (max 2 retries)', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "explainer"}');
        // First specialist attempt
        mockedLLM.mockResolvedValueOnce('Wrong answer.');
        // Validator fails
        mockedLLM.mockResolvedValueOnce('{"valid": false, "feedback": "Response is incorrect, needs more detail."}');
        // Second specialist attempt (with feedback)
        mockedLLM.mockResolvedValueOnce('Better answer with detail.');
        // Validator passes
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const steps: AgentStep[] = [];
        const result = await runAgentPipeline(
            makeConfig(), 'Explain this',
            'index=main', 'search', undefined,
            makeContext(), [], makeExec(),
            (step) => steps.push(step),
            new AbortController().signal,
        );

        expect(result.content).toBe('Better answer with detail.');
        expect(mockedLLM).toHaveBeenCalledTimes(5);
        // Two validations × 2 onStep calls each (running + final) = 4
        const validationSteps = steps.filter((s) => s.type === 'validation');
        expect(validationSteps.length).toBe(4);
        // First validation: running → blocked
        expect(validationSteps[0].status).toBe('running');
        expect(validationSteps[1].status).toBe('blocked');
        // Second validation: running → success
        expect(validationSteps[2].status).toBe('running');
        expect(validationSteps[3].status).toBe('success');
    });

    it('stops retrying after MAX_VALIDATOR_RETRIES', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "explainer"}');
        // Attempt 1
        mockedLLM.mockResolvedValueOnce('Bad answer 1.');
        mockedLLM.mockResolvedValueOnce('{"valid": false, "feedback": "Still wrong."}');
        // Attempt 2
        mockedLLM.mockResolvedValueOnce('Bad answer 2.');
        mockedLLM.mockResolvedValueOnce('{"valid": false, "feedback": "Still wrong."}');
        // Attempt 3
        mockedLLM.mockResolvedValueOnce('Bad answer 3.');
        mockedLLM.mockResolvedValueOnce('{"valid": false, "feedback": "Still wrong."}');

        const result = await runAgentPipeline(
            makeConfig(), 'Explain this',
            'index=main', 'search', undefined,
            makeContext(), [], makeExec(),
            () => {},
            new AbortController().signal,
        );

        // After 3 attempts (initial + 2 retries), gives up and returns last content
        expect(result.content).toBe('Bad answer 3.');
        // Manager(1) + 3*(specialist + validator) = 7
        expect(mockedLLM).toHaveBeenCalledTimes(7);
    });

    it('aborts mid-pipeline', async () => {
        const controller = new AbortController();
        mockedLLM.mockResolvedValueOnce('{"specialist": "explainer"}');

        // Abort before specialist call
        controller.abort();

        await expect(
            runAgentPipeline(
                makeConfig(), 'Explain',
                'index=main', 'search', undefined,
                makeContext(), [], makeExec(),
                () => {},
                controller.signal,
            ),
        ).rejects.toThrow('Aborted');
    });

    it('handles validator JSON parse failure gracefully (passes)', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "explainer"}');
        mockedLLM.mockResolvedValueOnce('Good explanation.');
        // Validator returns garbage
        mockedLLM.mockResolvedValueOnce('I think this is fine but I cannot return JSON');

        const result = await runAgentPipeline(
            makeConfig(), 'Explain',
            'index=main', 'search', undefined,
            makeContext(), [], makeExec(),
            () => {},
            new AbortController().signal,
        );

        // Should pass through (graceful fallback to valid=true)
        expect(result.content).toBe('Good explanation.');
    });

    it('passes run_query actions through without executing', async () => {
        mockedLLM.mockResolvedValueOnce('{"specialist": "writer"}');
        mockedLLM.mockResolvedValueOnce(
            'Try this:\n~~~action:run_query\nindex=main | head 5\n~~~',
        );
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        const exec = makeExec();
        const result = await runAgentPipeline(
            makeConfig(), 'Show me data',
            'index=main', 'search', undefined,
            makeContext(), [], exec,
            () => {},
            new AbortController().signal,
        );

        // run_query should NOT be auto-executed — it's a manual action
        expect(exec).not.toHaveBeenCalled();
        expect(result.actions.length).toBe(1);
        expect(result.actions[0].type).toBe('run_query');
    });

    it('passes time range to executeQuery', async () => {
        const exec = makeExec();
        const timeRange = { earliest: '-24h', latest: 'now' };

        mockedLLM.mockResolvedValueOnce('{"specialist": "writer"}');
        mockedLLM.mockResolvedValueOnce(
            '~~~action:auto_query\nindex=main | stats count\n~~~',
        );
        mockedLLM.mockResolvedValueOnce('Found the data.');
        mockedLLM.mockResolvedValueOnce('{"valid": true}');

        await runAgentPipeline(
            makeConfig(), 'Check data',
            'index=main', 'search', timeRange,
            makeContext(), [], exec,
            () => {},
            new AbortController().signal,
        );

        // The executeQuery function was called (auto_query), which uses the app-level time range
        expect(exec).toHaveBeenCalledWith('index=main | stats count');
    });
});
