import { TUTORIAL_VALIDATION_STEPS } from './tutorialValidationSteps';

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    selector: string;
    panel?: 'setup' | 'query' | 'data' | 'validation' | 'results';
    placement?: 'above' | 'below' | 'right' | 'left';
}

/** All tutorial steps — streamlined 12-step tour */
export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'setup-bar',
        title: 'Your test setup',
        content:
            'Name your test, pick the target Splunk app, and choose between Synthetic Data ' +
            '(mock events you define) or Real Data (query runs against live Splunk). ' +
            'The stepper bar shows your progress through Query, Data, and Validation.',
        selector: '[data-tutorial="setup-bar"]',
        panel: 'setup',
    },
    {
        id: 'spl-editor',
        title: 'Write or load your query',
        content:
            'Type SPL directly or load from a saved search using the dropdown above. ' +
            'The editor highlights dangerous commands and supports syntax coloring. ' +
            'The SPL is always editable — your original saved search is never modified.',
        selector: '[data-tutorial="spl-editor"], .relative.flex-1.min-w-0',
        panel: 'query',
    },
    {
        id: 'wizard-nav-next',
        title: 'Navigate between steps',
        content:
            'Use the floating arrows on the card edges, the Prev/Next buttons in the ' +
            'top bar, or keyboard arrow keys to move between steps. ' +
            'Completed steps show a green checkmark and are clickable.',
        selector: '[data-tutorial="wizard-float-nav"]',
        panel: 'query',
        placement: 'left',
    },
    {
        id: 'row-identifier',
        title: 'Pick your data source',
        content:
            'The sidebar highlights data sources in your query. Click one to add it as ' +
            'an input — it tells the test runner which part of the query to replace ' +
            'with your test data. You can also type it manually.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="Pick from sidebar"]',
        panel: 'data',
    },
    {
        id: 'query-sidebar',
        title: 'Query sidebar',
        content:
            'Shows your SPL with highlighted data sources. Click a source to add it ' +
            'as an input. Click "edit" for inline SPL changes. Drag the edge to resize.',
        selector: '[data-tutorial="query-sidebar"]',
        panel: 'data',
        placement: 'right',
    },
    {
        id: 'input-modes',
        title: 'Provide test data',
        content:
            'Four modes: Fields (build events field-by-field), JSON (paste raw events), ' +
            'Query Data (pull real events from Splunk), or No Events (for queries that ' +
            'generate their own data like makeresults or inputlookup).',
        selector: '[data-tutorial="input-modes"], .flex.gap-0\\.5.mb-4',
        panel: 'data',
    },
    {
        id: 'gen-toggle',
        title: 'Event generator',
        content:
            'Enable the generator to multiply your base events with variations. ' +
            'Define rules for numbered sequences, pick lists, IP addresses, and more. ' +
            'Great for volume testing with realistic data patterns.',
        selector: '[data-tutorial="gen-toggle"], .mt-4.rounded-lg.border.select-none',
        panel: 'data',
    },
    ...TUTORIAL_VALIDATION_STEPS,
];
