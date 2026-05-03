import { TUTORIAL_VALIDATION_STEPS } from './tutorialValidationSteps';

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    selector: string;
    panel?: 'setup' | 'query' | 'data' | 'validation' | 'results';
    placement?: 'above' | 'below' | 'right' | 'left';
}

/** All tutorial steps — 15-step guided tour */
export const TUTORIAL_STEPS: TutorialStep[] = [
    // ── Step 1: Setup bar ──
    {
        id: 'setup-bar',
        title: '1/15 — Your test setup',
        content:
            'Name your test, pick the target Splunk app, and choose between Synthetic Data ' +
            '(mock events you define) or Real Data (query runs against live Splunk).',
        selector: '[data-tutorial="setup-bar"]',
        panel: 'setup',
    },
    // ── Step 2: SPL editor ──
    {
        id: 'spl-editor',
        title: '2/15 — Write your query',
        content:
            'Type SPL directly or load from a saved search using the dropdown above. ' +
            'The editor highlights dangerous commands and supports syntax coloring.',
        selector: '[data-tutorial="spl-editor"], .relative.flex-1.min-w-0',
        panel: 'query',
    },
    // ── Step 3: Saved search picker ──
    {
        id: 'saved-search',
        title: '3/15 — Load from saved search',
        content:
            'Pick a saved search or alert to load its SPL and time range automatically. ' +
            'The query is always editable — your saved search is never modified. ' +
            'Drift detection warns you if the source changes later.',
        selector: '[data-tutorial="saved-search"], input[placeholder="Search saved searches..."]',
        panel: 'query',
    },
    // ── Step 4: Navigation ──
    {
        id: 'wizard-nav-next',
        title: '4/15 — Navigate between steps',
        content:
            'Use the floating arrows on the card edges, the Prev/Next buttons in the ' +
            'top bar, or keyboard arrow keys. Completed steps show a green checkmark.',
        selector: '[data-tutorial="wizard-float-nav"]',
        panel: 'query',
        placement: 'left',
    },
    // ── Step 5: Data source picker ──
    {
        id: 'row-identifier',
        title: '5/15 — Pick your data source',
        content:
            'The sidebar highlights data sources in your query. Click one to add it as ' +
            'an input — it tells the test runner which part of the query to replace ' +
            'with your test data. You can also type it manually.',
        selector: '[data-tutorial="row-identifier"], input[placeholder*="Pick from sidebar"]',
        panel: 'data',
    },
    // ── Step 6: Query sidebar ──
    {
        id: 'query-sidebar',
        title: '6/15 — Query sidebar',
        content:
            'Shows your SPL with highlighted data sources. Click a source to add it as ' +
            'an input. Click "edit" for inline SPL changes. Drag the edge to resize.',
        selector: '[data-tutorial="query-sidebar"]',
        panel: 'data',
        placement: 'right',
    },
    // ── Step 7: Input modes ──
    {
        id: 'input-modes',
        title: '7/15 — Choose your input mode',
        content:
            'Fields mode builds events field-by-field. JSON mode accepts raw events. ' +
            'Query Data pulls real events from Splunk. No Events skips injection ' +
            'for queries that generate their own data.',
        selector: '[data-tutorial="input-modes"], .flex.gap-0\\.5.mb-4',
        panel: 'data',
    },
    // ── Step 8: Scenarios ──
    {
        id: 'scenarios',
        title: '8/15 — Test scenarios',
        content:
            'Each scenario is an independent test case with its own inputs. Use multiple ' +
            'scenarios to test different data combinations against the same query. ' +
            'Add scenarios with the + tab.',
        selector: '[data-tutorial="scenario-tabs"]',
        panel: 'data',
    },
    // ── Step 9: Event generator ──
    {
        id: 'gen-toggle',
        title: '9/15 — Event generator',
        content:
            'Enable the generator to multiply your base events with variations — ' +
            'numbered sequences, pick lists, IP addresses, and more. ' +
            'Great for volume testing with realistic data patterns.',
        selector: '[data-tutorial="gen-toggle"], .mt-4.rounded-lg.border.select-none',
        panel: 'data',
    },
    ...TUTORIAL_VALIDATION_STEPS,
];
