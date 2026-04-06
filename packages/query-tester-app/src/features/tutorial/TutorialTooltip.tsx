/**
 * TutorialTooltip — floating card with step info, arrow, step badge, and nav buttons.
 *
 * Automatically positions itself above or below the target element based on
 * available viewport space. Includes a triangular arrow pointing at the target.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { TutorialStep } from './tutorialSteps';

export interface TutorialTooltipProps {
    step: TutorialStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

type Placement = 'above' | 'below';

const TOOLTIP_GAP = 16;
const ARROW_SIZE = 8;
const VIEWPORT_PADDING = 16;

interface Position {
    top: number;
    left: number;
    arrowLeft: number;
    placement: Placement;
}

/** Try each comma-separated selector individually so the first selector wins, not DOM order. */
function queryFirst(selector: string): Element | null {
    for (const part of selector.split(',')) {
        const el = document.querySelector(part.trim());
        if (el) return el;
    }
    return null;
}

function computePosition(
    targetSelector: string,
    tooltipEl: HTMLDivElement | null
): Position | null {
    const target = queryFirst(targetSelector);
    if (!target || !tooltipEl) return null;

    const tr = target.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer below; flip above if not enough room
    const spaceBelow = vh - tr.bottom;
    const placement: Placement =
        spaceBelow >= th + TOOLTIP_GAP + ARROW_SIZE ? 'below' : 'above';

    const top =
        placement === 'below'
            ? tr.bottom + TOOLTIP_GAP
            : tr.top - th - TOOLTIP_GAP;

    // Center horizontally on the target, clamped to viewport
    const idealLeft = tr.left + tr.width / 2 - tw / 2;
    const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(idealLeft, vw - tw - VIEWPORT_PADDING)
    );

    // Arrow points at target center
    const targetCenterX = tr.left + tr.width / 2;
    const arrowLeft = Math.max(
        ARROW_SIZE * 2,
        Math.min(targetCenterX - left, tw - ARROW_SIZE * 2)
    );

    return { top, left, arrowLeft, placement };
}

export function TutorialTooltip({
    step,
    stepIndex,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
}: TutorialTooltipProps): React.ReactElement {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<Position | null>(null);

    useEffect(() => {
        const update = () =>
            setPos(computePosition(step.selector, tooltipRef.current));

        // Initial + deferred (fonts/layout may shift)
        update();
        const raf = requestAnimationFrame(update);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [step.selector]);

    const isLast = stepIndex === totalSteps - 1;

    return (
        <div
            ref={tooltipRef}
            className="fixed z-[9995] w-80 max-w-[calc(100vw-32px)]"
            style={{
                top: pos ? pos.top : -9999,
                left: pos ? pos.left : -9999,
                visibility: pos ? 'visible' : 'hidden',
            }}
        >
            {/* Arrow — above or below the card */}
            {pos && pos.placement === 'below' && (
                <Arrow direction="up" leftPx={pos.arrowLeft} />
            )}

            {/* Card body */}
            <div className="bg-navy-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                {/* Header with step badge */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-btnprimary/20 text-btnprimary text-[11px] font-bold">
                        {stepIndex + 1}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
                        Step {stepIndex + 1} of {totalSteps}
                    </span>
                </div>

                {/* Title + content */}
                <div className="px-4 pt-1 pb-3">
                    <h4 className="text-sm font-semibold text-slate-100 mb-1">
                        {step.title}
                    </h4>
                    <p className="text-[13px] leading-relaxed text-slate-400">
                        {step.content}
                    </p>
                </div>

                {/* Footer with buttons */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/60 bg-navy-900/40">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="text-[12px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                    >
                        Skip tour
                    </button>
                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                onClick={onPrev}
                                className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-navy-700 cursor-pointer transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onNext}
                            className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg bg-btnprimary text-white hover:bg-btnprimary-hover cursor-pointer transition-colors"
                        >
                            {isLast ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>

            {pos && pos.placement === 'above' && (
                <Arrow direction="down" leftPx={pos.arrowLeft} />
            )}
        </div>
    );
}

function Arrow({ direction, leftPx }: { direction: 'up' | 'down'; leftPx: number }) {
    const isUp = direction === 'up';
    return (
        <div className="absolute" style={{
            left: leftPx - ARROW_SIZE, [isUp ? 'top' : 'bottom']: -ARROW_SIZE,
            width: 0, height: 0,
            borderLeft: `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            ...(isUp ? { borderBottom: `${ARROW_SIZE}px solid #202b43` } : { borderTop: `${ARROW_SIZE}px solid #202b43` }),
        }} />
    );
}
