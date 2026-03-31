/**
 * Tests for debugPipeline — pipe splitting and progressive execution.
 */
import { splitPipeline, runDebugPipeline } from '../debugPipeline';
import type { AgentStep } from '../agentLoop';
import type { IdeRunResponse } from '../../../api/ideApi';

describe('splitPipeline', () => {
    it('returns the full SPL when no pipes', () => {
        expect(splitPipeline('index=main')).toEqual(['index=main']);
    });

    it('splits at top-level pipes', () => {
        const result = splitPipeline('index=main | stats count | where count > 5');
        expect(result).toEqual([
            'index=main',
            'index=main | stats count',
            'index=main | stats count | where count > 5',
        ]);
    });

    it('does not split inside double quotes', () => {
        const spl = 'index=main | eval x="a | b" | stats count';
        const result = splitPipeline(spl);
        expect(result).toEqual([
            'index=main',
            'index=main | eval x="a | b"',
            'index=main | eval x="a | b" | stats count',
        ]);
    });

    it('does not split inside single quotes', () => {
        const spl = "index=main | eval x='a | b' | stats count";
        const result = splitPipeline(spl);
        expect(result).toEqual([
            'index=main',
            "index=main | eval x='a | b'",
            "index=main | eval x='a | b' | stats count",
        ]);
    });

    it('does not split inside subsearch brackets', () => {
        const spl = 'index=main [search index=other | stats count] | where count > 0';
        const result = splitPipeline(spl);
        expect(result).toEqual([
            'index=main [search index=other | stats count]',
            'index=main [search index=other | stats count] | where count > 0',
        ]);
    });

    it('handles nested brackets', () => {
        const spl = 'index=main [search [search index=inner | head 1] | stats count] | table _raw';
        const result = splitPipeline(spl);
        expect(result).toEqual([
            'index=main [search [search index=inner | head 1] | stats count]',
            'index=main [search [search index=inner | head 1] | stats count] | table _raw',
        ]);
    });

    it('limits to 15 pipe stages', () => {
        const pipes = Array.from({ length: 20 }, (_, i) => 'cmd' + i).join(' | ');
        const result = splitPipeline(pipes);
        // 15 intermediate + 1 final (full SPL) = at most 17
        expect(result.length).toBeLessThanOrEqual(17);
        // Last element should be the full SPL
        expect(result[result.length - 1]).toBe(pipes.trim());
    });
});

describe('runDebugPipeline', () => {
    it('runs each prefix and calls onStep', async () => {
        const steps: AgentStep[] = [];
        const mockExec = jest.fn().mockResolvedValue({
            status: 'success',
            resultRows: [{ count: '5' }],
            resultCount: 1,
        } as Partial<IdeRunResponse>);

        const controller = new AbortController();
        const result = await runDebugPipeline(
            'index=main | stats count',
            mockExec,
            (step) => steps.push(step),
            controller.signal,
        );

        // Two prefixes: "index=main" and "index=main | stats count"
        expect(mockExec).toHaveBeenCalledTimes(2);
        // Each prefix gets a running + success step
        expect(steps.length).toBe(4);
        expect(steps[0].status).toBe('running');
        expect(steps[1].status).toBe('success');
        expect(result).toContain('Debug Pipeline Results');
        expect(result).toContain('1 results');
    });

    it('handles query errors gracefully', async () => {
        const steps: AgentStep[] = [];
        const mockExec = jest.fn()
            .mockResolvedValueOnce({ status: 'success', resultRows: [{ x: '1' }], resultCount: 1 })
            .mockRejectedValueOnce(new Error('Bad SPL'));

        const result = await runDebugPipeline(
            'index=main | badcommand',
            mockExec,
            (step) => steps.push(step),
            new AbortController().signal,
        );

        expect(result).toContain('ERROR: Bad SPL');
        const errorSteps = steps.filter((s) => s.status === 'error');
        expect(errorSteps.length).toBe(1);
    });

    it('respects abort signal', async () => {
        const controller = new AbortController();
        controller.abort();

        const mockExec = jest.fn();
        const result = await runDebugPipeline(
            'index=main | stats count | where count > 5',
            mockExec,
            () => {},
            controller.signal,
        );

        expect(mockExec).not.toHaveBeenCalled();
        expect(result).toContain('Debug Pipeline Results');
    });
});
