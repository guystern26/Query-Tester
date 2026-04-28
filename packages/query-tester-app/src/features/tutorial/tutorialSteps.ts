import { TUTORIAL_VALIDATION_STEPS } from './tutorialValidationSteps';

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    selector: string;
    panel?: 'setup' | 'query' | 'data' | 'validation' | 'results';
    placement?: 'above' | 'below' | 'right' | 'left';
}

/** All tutorial steps — setup, query, navigation, data input, then validation & results */
export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'setup-bar',
        title: 'Your test setup',
        content:
            'This bar contains your test name, target app, test type, and step navigation. ' +
            'The app determines the Splunk namespace for SPL execution.',
        selector: '[data-tutorial="setup-bar"]',
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
        id: 'wizard-stepper',
        title: 'Step navigation',
        content:
            'The wizard guides you through three steps: Query, Data, and Validation. ' +
            'Completed steps show a green checkmark and are clickable — you can jump back ' +
            'to any step you have already visited. You can also use keyboard arrow keys.',
        selector: '[data-tutorial="wizard-stepper"]',
        panel: 'query',
    },
    {
        id: 'wizard-nav-next',
        title: 'Click here to advance',
        content:
            'This chevron takes you to the next step. You can also press the right arrow key. ' +
            'On the Validation step, it becomes a green play button to run the test. ' +
            'The left chevron on the other side goes back.',
        selector: '[data-tutorial="wizard-nav-next"]',
        panel: 'query',
        placement: 'left',
    },
    // ── Transition: Query → Data ──
    {
        id: 'transition-to-data',
        title: 'Moving to Data',
        content:
            'Now we will move to the Data section, where you define the test events ' +
            'that will be injected into your query. Click Next to continue.',
        selector: '[data-tutorial="wizard-nav-next"]',
        panel: 'query',
        placement: 'left',
    },
    {
        id: 'row-identifier',
        title: 'Set your data source',
        content:
            'The "Inject Into" field tells the test runner which part of your query to replace ' +
            'with test data. It should match the base search clause — typically the index and ' +
            'sourcetype. Matching text is highlighted in the query sidebar.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="index=main sourcetype"]',
        panel: 'data',
    },
    {
        id: 'row-id-value',
        title: 'The value must match exactly',
        content:
            'The text must exactly match what appears in your SPL. If your query says ' +
            'index=main sourcetype=access_combined, the inject-into field must be that exact ' +
            'string. Check the query sidebar to confirm the match is highlighted.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="index=main sourcetype"]',
        panel: 'data',
    },
    {
        id: 'query-sidebar',
        title: 'Query sidebar',
        content:
            'The query sidebar shows your SPL with syntax highlighting while you work on Data ' +
            'or Validation. It is resizable — drag the edge to adjust width, or collapse it ' +
            'by dragging it small. Click "edit" to jump back to the Query step.',
        selector: '[data-tutorial="query-sidebar"]',
        panel: 'data',
        placement: 'right',
    },
    {
        id: 'input-modes',
        title: 'Four ways to provide input data',
        content:
            'Each scenario needs test data. Choose Fields mode to build events field-by-field, ' +
            'JSON mode to paste raw events, Query Data to pull real events from Splunk, ' +
            'or No Events when your query generates its own data.',
        selector: '[data-tutorial="input-modes"], .flex.gap-0\\.5.mb-4',
        panel: 'data',
    },
    {
        id: 'mode-fields',
        title: 'Fields mode',
        content:
            'Build events by adding field names and values. Each row becomes a field in the ' +
            'generated event. This is the easiest way to create structured test data.',
        selector: '[data-tutorial="mode-fields"], .flex.gap-0\\.5.mb-4 button:first-child',
        panel: 'data',
    },
    {
        id: 'mode-json',
        title: 'JSON mode',
        content:
            'Paste raw JSON events directly. Useful when you have sample data from a real ' +
            'Splunk search or need complex nested structures.',
        selector: '[data-tutorial="mode-json"], .flex.gap-0\\.5.mb-4 button:nth-child(2)',
        panel: 'data',
    },
    {
        id: 'mode-query-data',
        title: 'Query Data mode',
        content:
            'Pull real events from Splunk as test input. Write an SPL query and pick a time range — ' +
            'the results become your test data. Great for replaying specific incidents or using ' +
            'production data from a known time window.',
        selector: '[data-tutorial="mode-query-data"], .flex.gap-0\\.5.mb-4 button:nth-child(3)',
        panel: 'data',
    },
    {
        id: 'mode-no-events',
        title: 'No Events mode',
        content:
            'Skip event injection entirely. Use this when your query generates data on its own ' +
            '(e.g. | makeresults, | inputlookup) and you only need to validate the output.',
        selector: '[data-tutorial="mode-no-events"], .flex.gap-0\\.5.mb-4 button:last-child',
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
    // ── Transition: Data → Validation ──
    {
        id: 'transition-to-validation',
        title: 'Moving to Validation',
        content:
            'Now we will move to the Validation section, where you define what the query ' +
            'results should look like — row counts, field values, and pass/fail conditions.',
        selector: '[data-tutorial="wizard-nav-next"]',
        panel: 'data',
        placement: 'left',
    },
    ...TUTORIAL_VALIDATION_STEPS,
];
