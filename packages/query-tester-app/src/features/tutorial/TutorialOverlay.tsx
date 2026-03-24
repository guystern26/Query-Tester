/**
 * TutorialOverlay — composes TutorialSpotlight + TutorialTooltip into a portal.
 *
 * Handles:
 * - Portal rendering into document.body (avoids z-index / overflow issues)
 * - Step completion detection: click, input, or auto-advance
 * - ResizeObserver to re-trigger positioning when target element resizes
 * - Keyboard navigation (Escape to skip, Enter/ArrowRight to advance)
 */
import React, { useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { TutorialSpotlight } from './TutorialSpotlight';
import { TutorialTooltip } from './TutorialTooltip';
import type { UseTutorialReturn } from './useTutorial';

/** Try each comma-separated selector individually so the first selector wins, not DOM order. */
function queryFirst(selector: string): Element | null {
    for (const part of selector.split(',')) {
        const el = document.querySelector(part.trim());
        if (el) return el;
    }
    return null;
}

export interface TutorialOverlayProps {
    tutorial: UseTutorialReturn;
}

export function TutorialOverlay({ tutorial }: TutorialOverlayProps): React.ReactElement | null {
    const { isActive, currentStep, stepIndex, totalSteps, next, prev, skip } = tutorial;
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Force re-render when the observed target element resizes
    const forceUpdate = useForceUpdate();

    // Observe the current target element for size changes
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const el = queryFirst(currentStep.selector);
        if (!el) return;

        const observer = new ResizeObserver(() => {
            forceUpdate();
        });
        observer.observe(el);
        resizeObserverRef.current = observer;

        return () => {
            observer.disconnect();
            resizeObserverRef.current = null;
        };
    }, [isActive, currentStep, forceUpdate]);

    // Detect completion via click/input on the target element
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const el = queryFirst(currentStep.selector);
        if (!el) return;

        const handleInteraction = () => {
            // Small delay so the user's action registers visually before advancing
            setTimeout(next, 300);
        };

        el.addEventListener('click', handleInteraction);
        el.addEventListener('input', handleInteraction);

        return () => {
            el.removeEventListener('click', handleInteraction);
            el.removeEventListener('input', handleInteraction);
        };
    }, [isActive, currentStep, next]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!isActive) return;
            if (e.key === 'Escape') {
                skip();
            } else if (e.key === 'ArrowLeft') {
                prev();
            } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
                next();
            }
        },
        [isActive, next, prev, skip]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Scroll the target element into view when the step changes.
    // Always scrolls — handles elements inside overflow containers (e.g. generator in data panel).
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const timer = setTimeout(() => {
            const el = queryFirst(currentStep.selector);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);

        return () => clearTimeout(timer);
    }, [isActive, currentStep]);

    if (!isActive || !currentStep) return null;

    return ReactDOM.createPortal(
        <>
            <TutorialSpotlight selector={currentStep.selector} />
            <TutorialTooltip
                step={currentStep}
                stepIndex={stepIndex}
                totalSteps={totalSteps}
                onNext={next}
                onPrev={prev}
                onSkip={skip}
            />
        </>,
        document.body
    );
}

/**
 * Minimal force-update hook for React 16 (no useReducer shortcut needed).
 * Returns a stable callback that triggers a re-render.
 */
function useForceUpdate(): () => void {
    const ref = useRef(0);
    const [, setState] = React.useState(0);
    return useCallback(() => {
        ref.current += 1;
        setState(ref.current);
    }, []);
}
