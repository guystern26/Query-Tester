/**
 * useTutorial — manages tutorial tour state.
 *
 * No localStorage persistence — every tutorial launch starts fresh from step 0
 * with a pre-built test loaded into the store. This avoids stale resume bugs
 * and keeps the experience consistent.
 */
import { useState, useCallback } from 'react';
import { TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialStep } from './tutorialSteps';
import { loadTutorialTest } from './tutorialSeeder';

export interface UseTutorialReturn {
    /** Whether the tutorial overlay should be shown */
    isActive: boolean;
    /** Current step definition, or null when inactive */
    currentStep: TutorialStep | null;
    /** Zero-based index of the current step */
    stepIndex: number;
    /** Total number of steps */
    totalSteps: number;
    /** Advance to the next step, or finish if on the last step */
    next: () => void;
    /** Go back to the previous step */
    prev: () => void;
    /** Skip / dismiss the entire tutorial */
    skip: () => void;
    /** Start the tutorial from step 0 (loads a pre-built test) */
    start: () => void;
    /** Restart from step 0 (same as start) */
    restart: () => void;
    /** Jump to a specific step by index */
    goToStep: (index: number) => void;
}

export function useTutorial(): UseTutorialReturn {
    const [isActive, setIsActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const currentStep = isActive ? TUTORIAL_STEPS[stepIndex] || null : null;

    const next = useCallback(() => {
        const nextIdx = stepIndex + 1;
        if (nextIdx >= TUTORIAL_STEPS.length) {
            setIsActive(false);
            return;
        }
        setStepIndex(nextIdx);
    }, [stepIndex]);

    const prev = useCallback(() => {
        if (stepIndex > 0) {
            setStepIndex(stepIndex - 1);
        }
    }, [stepIndex]);

    const skip = useCallback(() => {
        setIsActive(false);
    }, []);

    const start = useCallback(() => {
        loadTutorialTest();
        setStepIndex(0);
        setIsActive(true);
    }, []);

    const restart = useCallback(() => {
        loadTutorialTest();
        setStepIndex(0);
        setIsActive(true);
    }, []);

    const goToStep = useCallback(
        (index: number) => {
            if (index < 0 || index >= TUTORIAL_STEPS.length) return;
            setStepIndex(index);
            if (!isActive) setIsActive(true);
        },
        [isActive],
    );

    return {
        isActive,
        currentStep,
        stepIndex,
        totalSteps: TUTORIAL_STEPS.length,
        next,
        prev,
        skip,
        start,
        restart,
        goToStep,
    };
}
