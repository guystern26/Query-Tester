import { TUTORIAL_VALIDATION_STEPS } from './tutorialValidationSteps';

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    /** CSS selector for the element to highlight. TODO where not yet deterministic. */
    selector: string;
    /** Which builder panel must be visible for this step */
    panel?: 'setup' | 'query' | 'data' | 'validation' | 'results';
}

/** All tutorial steps — setup, query, data input, then validation & results from split file */
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
    ...TUTORIAL_VALIDATION_STEPS,
];
