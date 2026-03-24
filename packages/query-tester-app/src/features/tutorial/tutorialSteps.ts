export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    /** CSS selector for the element to highlight. TODO where not yet deterministic. */
    selector: string;
    /** Which builder panel must be visible for this step */
    panel?: 'setup' | 'query' | 'data' | 'validation' | 'results';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'setup-bar',
        title: 'Your test setup',
        content:
            'This bar shows your test name, target app, and test type. Every test targets ' +
            'a specific Splunk app — this determines the namespace for all SPL execution. ' +
            'Once you add data, the app locks to prevent namespace mismatches.',
        selector: '[data-tutorial="setup-bar"], .flex.items-center.gap-5.px-5.py-2.bg-navy-900.rounded-xl',
        panel: 'setup',
    },
    {
        id: 'spl-editor',
        title: 'Write your query',
        content:
            'Type or paste the SPL you want to test. The editor supports syntax highlighting ' +
            'and will warn you about dangerous commands like delete or outputlookup.',
        selector: '[data-tutorial="spl-editor"], .relative.flex-1.min-w-0',
        panel: 'query',
    },
    {
        id: 'saved-search',
        title: 'Or pick a saved search',
        content:
            'Instead of writing SPL from scratch, load it from an existing saved search or alert. ' +
            'The SPL is copied in — you can still edit it freely. If the saved search changes ' +
            'later, drift detection will warn you.',
        selector: '[data-tutorial="saved-search"], input[placeholder="Search saved searches..."]',
        panel: 'query',
    },
    {
        id: 'spl-editable',
        title: 'SPL is always editable',
        content:
            'Even after loading from a saved search, the SPL is yours to tweak. Adjust time ' +
            'ranges, add filters, or simplify the query for testing. The original saved search ' +
            'is never modified.',
        selector: '[data-tutorial="spl-editor"], .relative.flex-1.min-w-0',
        panel: 'query',
    },
    {
        id: 'row-identifier',
        title: 'Set your row identifier',
        content:
            'The row identifier tells the injector where to insert your test data into the query. ' +
            'It should match the base search clause — typically the index and sourcetype.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="index=main sourcetype"]',
        panel: 'query',
    },
    {
        id: 'row-id-value',
        title: 'The value must be exact too',
        content:
            'The identifier must exactly match what appears in your SPL. If your query says ' +
            '`index=main sourcetype=access_combined`, the identifier must be that exact string. ' +
            'Whitespace and casing matter.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="index=main sourcetype"]',
        panel: 'query',
    },
    {
        id: 'input-modes',
        title: 'Four ways to provide input data',
        content:
            'Each scenario needs test data. Choose Fields mode to build events field-by-field, ' +
            'JSON mode to paste raw events, Query Data to pull real events from Splunk, ' +
            'or No Events when your query generates its own data.',
        selector: '[data-tutorial="input-modes"], .bg-navy-950\\/80.rounded-xl.p-1.border.w-fit.mb-4',
        panel: 'data',
    },
    {
        id: 'mode-fields',
        title: 'Fields mode',
        content:
            'Build events by adding field names and values. Each row becomes a field in the ' +
            'generated event. This is the easiest way to create structured test data.',
        selector: '[data-tutorial="mode-fields"], .bg-navy-950\\/80.rounded-xl.mb-4 .rounded-lg.bg-accent-900:first-child',
        panel: 'data',
    },
    {
        id: 'mode-json',
        title: 'JSON mode',
        content:
            'Paste raw JSON events directly. Useful when you have sample data from a real ' +
            'Splunk search or need complex nested structures.',
        selector: '[data-tutorial="mode-json"], .bg-navy-950\\/80.rounded-xl.mb-4 .rounded-lg:nth-child(2)',
        panel: 'data',
    },
    {
        id: 'mode-query-data',
        title: 'Query Data mode',
        content:
            'Pull real events from Splunk as test input. Write an SPL query and pick a time range — ' +
            'the results become your test data. Great for replaying specific incidents or using ' +
            'production data from a known time window.',
        selector: '[data-tutorial="mode-query-data"], .bg-navy-950\\/80.rounded-xl.mb-4 .rounded-lg:nth-child(3)',
        panel: 'data',
    },
    {
        id: 'mode-no-events',
        title: 'No Events mode',
        content:
            'Skip event injection entirely. Use this when your query generates data on its own ' +
            '(e.g. | makeresults, | inputlookup) and you only need to validate the output.',
        selector: '[data-tutorial="mode-no-events"], .bg-navy-950\\/80.rounded-xl.mb-4 .rounded-lg:last-child',
        panel: 'data',
    },
    {
        id: 'gen-toggle',
        title: 'Auto-generate events',
        content:
            'Enable the event generator to create many events from a few rules. Define a base ' +
            'event and the generator multiplies it with variations — great for volume testing.',
        selector: '[data-tutorial="gen-toggle"], .mt-4.rounded-lg.border.select-none',
        panel: 'data',
    },
    {
        id: 'gen-rules',
        title: 'Generator rules',
        content:
            'Each rule targets a field and defines how to generate values. Types include ' +
            'numbered sequences, pick lists, IP addresses, emails, and more. Rules compose — ' +
            'multiple rules multiply the event count.',
        selector: '[data-tutorial="gen-rules"], .flex.flex-col.gap-2\\.5.pt-2',
        panel: 'data',
    },
    {
        id: 'gen-pick-list',
        title: 'Weighted variants',
        content:
            'Pick list rules let you define weighted value pools. For example, 70% "success" ' +
            'and 30% "failure". The generator distributes events proportionally across the values.',
        selector: '[data-tutorial="gen-pick-list"], .bg-navy-900.border.border-slate-800.rounded-lg.p-3.mb-2',
        panel: 'data',
    },
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
