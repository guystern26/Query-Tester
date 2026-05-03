import type { TutorialStep } from './tutorialSteps';

/** Validation, results, and library tutorial steps — streamlined */
export const TUTORIAL_VALIDATION_STEPS: TutorialStep[] = [
    {
        id: 'result-count',
        title: 'Result count validation',
        content:
            'The simplest check: verify how many rows your query returns. ' +
            '"Greater than 0" is a common smoke test. Combine with field conditions for deeper testing.',
        selector: '[data-tutorial="result-count"]',
        panel: 'validation',
    },
    {
        id: 'field-conditions',
        title: 'Field conditions',
        content:
            'Validate specific field values: "status equals 200", "duration less than 5000". ' +
            'Multiple conditions per field are joined with AND or OR. Click the operator to change it.',
        selector: '[data-tutorial="field-conditions"], .flex.flex-col.gap-3',
        panel: 'validation',
    },
    {
        id: 'validation-scope',
        title: 'Validation scope',
        content:
            'Choose whether conditions must match any row, every row, or exactly N rows. ' +
            'Use iJump mode (toggle at top) to test Splunk alert trigger logic instead.',
        selector: '[data-tutorial="validation-scope"]',
        panel: 'validation',
    },
    {
        id: 'results-bar',
        title: 'Run and see results',
        content:
            'Click Run Test in the bottom bar. Results show pass/fail for each scenario. ' +
            'Expand the bar to see actual values compared against your conditions. ' +
            'Save to the Library to schedule, track history, and get failure email alerts.',
        selector: '[data-tutorial="results-bar"], .fixed.bottom-0.left-0.right-0',
        panel: 'validation',
    },
];
