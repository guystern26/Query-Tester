import type { TutorialStep } from './tutorialSteps';

/** Validation, results, and library tutorial steps — split from tutorialSteps.ts */
export const TUTORIAL_VALIDATION_STEPS: TutorialStep[] = [
    {
        id: 'result-count',
        title: 'Result count is enough on its own',
        content:
            'The simplest validation: just check how many rows your query returns. Set an ' +
            'expected count with an operator (equals, greater than, etc.) and you have a test.',
        selector: '[data-tutorial="result-count"], .bg-navy-900.rounded-lg.p-3.border',
        panel: 'validation',
    },
    {
        id: 'result-count-op',
        title: 'Count operators',
        content:
            'Choose how to compare the actual result count: exactly equals, greater than, ' +
            'less than, or a range. "Greater than 0" is a common smoke test.',
        selector: '[data-tutorial="result-count-op"], .bg-navy-900.rounded-lg.p-3 select',
        panel: 'validation',
    },
    {
        id: 'field-conditions',
        title: 'Per-field conditions',
        content:
            'Go beyond counts — validate specific field values in the results. Add conditions ' +
            'like "status must equal 200" or "duration must be less than 5000".',
        selector: '[data-tutorial="field-conditions"], .flex.flex-col.gap-3',
        panel: 'validation',
    },
    {
        id: 'field-logic',
        title: 'AND vs OR',
        content:
            'Field conditions within a group are ANDed (all must match). Switch to OR when ' +
            'any single condition passing is enough. Groups let you mix AND/OR logic.',
        selector: '[data-tutorial="field-logic"], .bg-navy-800.rounded-lg.border.border-slate-700.p-4',
        panel: 'validation',
    },
    {
        id: 'validation-scope',
        title: 'Per-event validation',
        content:
            'Choose whether conditions apply to any row, every row, or a specific row. ' +
            '"Any" passes if at least one row matches. "Every" requires all rows to match.',
        selector: '[data-tutorial="validation-scope"], .bg-navy-900.rounded-lg.p-3.border.border-slate-800',
        panel: 'validation',
    },
    {
        id: 'validation-type',
        title: 'Two validation modes',
        content:
            'Standard mode validates query results directly. iJump mode tests Splunk alerts — ' +
            'it checks whether the alert would have triggered based on your test data.',
        selector: '[data-tutorial="validation-type"], .bg-navy-950.rounded-lg.p-1.border.border-slate-700.w-fit',
        panel: 'validation',
    },
    {
        id: 'ijump-mode',
        title: 'iJump Alert mode',
        content:
            'iJump mode wraps your query in alert trigger logic. It validates that the alert ' +
            'fires (or does not fire) given your test events. Perfect for testing alerting rules.',
        selector: '[data-tutorial="ijump-mode"], .bg-navy-950.rounded-lg.p-1.border.border-slate-700.w-fit :last-child',
        panel: 'validation',
    },
    {
        id: 'query-only',
        title: 'Query Only mode',
        content:
            'Skip data injection and validation entirely — just run the SPL and see what comes ' +
            'back. Useful for exploring queries or debugging before writing full test scenarios.',
        selector: '[data-tutorial="query-only"], .bg-navy-950\\/80.rounded-xl.p-0\\.5.border :last-child',
        panel: 'setup',
    },
    {
        id: 'run-button',
        title: 'Run your test',
        content:
            'Hit Run to execute your test. The backend indexes your test events, runs the query, ' +
            'validates the results, and cleans up — all automatically.',
        selector: '[data-tutorial="run-button"], .fixed.bottom-0 .h-12 button',
        panel: 'results',
    },
    {
        id: 'results-bar',
        title: 'Results appear here',
        content:
            'After running, this bar shows pass/fail status for each scenario. Green means all ' +
            'conditions passed, red means at least one failed. Click to expand a scenario and see ' +
            'the full result card with actual values compared against your conditions.',
        selector: '[data-tutorial="results-bar"], .fixed.bottom-0.left-0.right-0',
        panel: 'results',
    },
    {
        id: 'export-btn',
        title: 'Export your test',
        content:
            'Export downloads your test definition as a JSON file. Use it to share tests with ' +
            'teammates, back them up locally, or send them to a backend system as a payload ' +
            'for CI/CD integration.',
        selector: '[data-tutorial="export-btn"]',
    },
    {
        id: 'import-btn',
        title: 'Import a test',
        content:
            'Import loads a test definition from a local JSON file. Use it to restore a backup, ' +
            'load a test shared by a teammate, or bring in tests from another environment.',
        selector: '[data-tutorial="import-btn"]',
    },
    {
        id: 'save-test-btn',
        title: 'Save to the library',
        content:
            'Save persists your test to the server-side Test Library. Once saved, you can access ' +
            'it from the Library page, set up a cron schedule to run it automatically, configure ' +
            'failure email alerts, and track run history over time.',
        selector: '[data-tutorial="save-test-btn"]',
    },
];
