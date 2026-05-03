import type { TutorialStep } from './tutorialSteps';

/** Validation, results, and save — steps 10-15 */
export const TUTORIAL_VALIDATION_STEPS: TutorialStep[] = [
    {
        id: 'result-count',
        title: '10/15 — Result count',
        content:
            'The simplest check: verify how many rows your query returns. ' +
            '"Greater than 0" is a common smoke test.',
        selector: '[data-tutorial="result-count"]',
        panel: 'validation',
    },
    {
        id: 'field-conditions',
        title: '11/15 — Field conditions',
        content:
            'Validate specific field values: "status equals 200", "count greater than 0". ' +
            'Click the operator chip to change it. Add multiple conditions per field.',
        selector: '[data-tutorial="field-conditions"], .flex.flex-col.gap-3',
        panel: 'validation',
    },
    {
        id: 'validation-scope',
        title: '12/15 — Validation scope',
        content:
            'Choose whether conditions must match any row, every row, or exactly N rows.',
        selector: '[data-tutorial="validation-scope"]',
        panel: 'validation',
    },
    {
        id: 'validation-type',
        title: '13/15 — Standard vs iJump',
        content:
            'Standard mode validates query results directly. iJump mode tests Splunk ' +
            'alert trigger logic — it checks whether the alert fires given your test data.',
        selector: '[data-tutorial="validation-type"]',
        panel: 'validation',
    },
    {
        id: 'results-bar',
        title: '14/15 — Run and see results',
        content:
            'Click Run Test in the bottom bar. Results show pass/fail for each scenario. ' +
            'Expand the bar to see actual values compared against your conditions.',
        selector: '[data-tutorial="results-bar"], .fixed.bottom-0.left-0.right-0',
        panel: 'validation',
    },
    {
        id: 'save-test-btn',
        title: '15/15 — Save to the library',
        content:
            'Save persists your test to the Test Library. From there you can schedule ' +
            'automatic runs, configure failure email alerts, and track run history.',
        selector: '[data-tutorial="save-test-btn"]',
    },
];
