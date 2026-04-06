/**
 * Tests for chatUtils — action block parsing with new auto_query/debug_pipeline types.
 */
import { parseActionBlocks } from '../chatUtils';

describe('parseActionBlocks', () => {
    it('parses run_query action', () => {
        const input = 'Try this:\n~~~action:run_query\nindex=main | head 5\n~~~\nDone.';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(cleanContent).toBe('Try this:\n\nDone.');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('run_query');
        expect(actions[0].payload).toBe('index=main | head 5');
    });

    it('parses auto_query action', () => {
        const input = 'Checking:\n~~~action:auto_query\nindex=main | stats count by sourcetype\n~~~';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(cleanContent).toBe('Checking:');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('auto_query');
    });

    it('parses debug_pipeline action', () => {
        const input = 'Let me debug:\n~~~action:debug_pipeline\n\n~~~';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(cleanContent).toBe('Let me debug:');
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('debug_pipeline');
    });

    it('blocks dangerous commands in auto_query', () => {
        const input = '~~~action:auto_query\n| delete index=main\n~~~';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(actions.length).toBe(0);
        expect(cleanContent).toContain('Blocked');
    });

    it('blocks dangerous commands in run_query', () => {
        const input = '~~~action:run_query\n| outputlookup test.csv\n~~~';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(actions.length).toBe(0);
        expect(cleanContent).toContain('Blocked');
    });

    it('does NOT block dangerous commands in update_spl (user decision)', () => {
        const input = '~~~action:update_spl\nindex=main | outputlookup results.csv\n~~~';
        const { cleanContent, actions } = parseActionBlocks(input);
        expect(actions.length).toBe(1);
        expect(actions[0].type).toBe('update_spl');
    });

    it('parses multiple mixed actions', () => {
        const input = [
            'Here are some things to try:',
            '~~~action:auto_query',
            'index=main | stats count',
            '~~~',
            'And also:',
            '~~~action:run_query',
            'index=main | head 3',
            '~~~',
            '~~~action:update_spl',
            'index=main | stats count by host',
            '~~~',
        ].join('\n');
        const { actions } = parseActionBlocks(input);
        expect(actions.length).toBe(3);
        expect(actions[0].type).toBe('auto_query');
        expect(actions[1].type).toBe('run_query');
        expect(actions[2].type).toBe('update_spl');
    });
});
