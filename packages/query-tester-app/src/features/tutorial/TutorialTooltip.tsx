/**
 * TutorialTooltip — floating card with step info, arrow, step badge, and nav buttons.
 * Supports above, below, right, and left placement.
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

type Placement = 'above' | 'below' | 'right' | 'left';

var TOOLTIP_GAP = 16;
var ARROW_SIZE = 8;
var VIEWPORT_PADDING = 16;

interface Position {
    top: number;
    left: number;
    arrowOffset: number;
    placement: Placement;
}

function queryFirst(selector: string): Element | null {
    var parts = selector.split(',');
    for (var i = 0; i < parts.length; i++) {
        var el = document.querySelector(parts[i].trim());
        if (el) return el;
    }
    return null;
}

function computePosition(
    targetSelector: string,
    tooltipEl: HTMLDivElement | null,
    preferredPlacement?: Placement
): Position | null {
    var target = queryFirst(targetSelector);
    if (!tooltipEl) return null;
    if (!target) {
        var tw2 = tooltipEl.offsetWidth;
        var th2 = tooltipEl.offsetHeight;
        return { top: window.innerHeight / 2 - th2 / 2, left: window.innerWidth / 2 - tw2 / 2, placement: 'below', arrowOffset: tw2 / 2 };
    }

    var tr = target.getBoundingClientRect();
    var tw = tooltipEl.offsetWidth;
    var th = tooltipEl.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Right placement
    if (preferredPlacement === 'right') {
        var rTop = tr.top + tr.height / 2 - th / 2;
        rTop = Math.max(VIEWPORT_PADDING, Math.min(rTop, vh - th - VIEWPORT_PADDING));
        var rLeft = tr.right + TOOLTIP_GAP;
        if (rLeft + tw <= vw - VIEWPORT_PADDING) {
            var arrowTop = Math.max(ARROW_SIZE * 2, Math.min(tr.top + tr.height / 2 - rTop, th - ARROW_SIZE * 2));
            return { top: rTop, left: rLeft, placement: 'right', arrowOffset: arrowTop };
        }
    }

    // Left placement
    if (preferredPlacement === 'left') {
        var lTop = tr.top + tr.height / 2 - th / 2;
        lTop = Math.max(VIEWPORT_PADDING, Math.min(lTop, vh - th - VIEWPORT_PADDING));
        var lLeft = tr.left - tw - TOOLTIP_GAP;
        if (lLeft >= VIEWPORT_PADDING) {
            var arrowTopL = Math.max(ARROW_SIZE * 2, Math.min(tr.top + tr.height / 2 - lTop, th - ARROW_SIZE * 2));
            return { top: lTop, left: lLeft, placement: 'left', arrowOffset: arrowTopL };
        }
    }

    // Default: below or above
    var spaceBelow = vh - tr.bottom;
    var placement: Placement = (preferredPlacement === 'above')
        ? 'above'
        : (spaceBelow >= th + TOOLTIP_GAP + ARROW_SIZE ? 'below' : 'above');

    var top = placement === 'below'
        ? tr.bottom + TOOLTIP_GAP
        : tr.top - th - TOOLTIP_GAP;

    var idealLeft = tr.left + tr.width / 2 - tw / 2;
    var left = Math.max(VIEWPORT_PADDING, Math.min(idealLeft, vw - tw - VIEWPORT_PADDING));

    var targetCenterX = tr.left + tr.width / 2;
    var arrowLeft = Math.max(ARROW_SIZE * 2, Math.min(targetCenterX - left, tw - ARROW_SIZE * 2));

    return { top: top, left: left, arrowOffset: arrowLeft, placement: placement };
}

export function TutorialTooltip({
    step, stepIndex, totalSteps, onNext, onPrev, onSkip,
}: TutorialTooltipProps): React.ReactElement {
    var tooltipRef = useRef<HTMLDivElement>(null);
    var posState = useState<Position | null>(null);
    var pos = posState[0];
    var setPos = posState[1];

    useEffect(function () {
        var update = function () {
            setPos(computePosition(step.selector, tooltipRef.current, step.placement));
        };
        update();
        var raf = requestAnimationFrame(update);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return function () {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [step.selector, step.placement]);

    var isLast = stepIndex === totalSteps - 1;

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
            {pos && pos.placement === 'below' && <Arrow direction="up" offset={pos.arrowOffset} horizontal />}
            {pos && pos.placement === 'right' && <Arrow direction="left" offset={pos.arrowOffset} horizontal={false} />}

            <div className="bg-navy-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-navy-700 text-blue-300 text-[11px] font-bold">
                        {stepIndex + 1}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">
                        Step {stepIndex + 1} of {totalSteps}
                    </span>
                </div>

                <div className="px-4 pt-1 pb-3">
                    <h4 className="text-sm font-semibold text-slate-100 mb-1">{step.title}</h4>
                    <p className="text-[13px] leading-relaxed text-slate-400">{step.content}</p>
                </div>

                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/60 bg-navy-900/40">
                    <button type="button" onClick={onSkip}
                        className="text-[12px] text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                        Skip tour
                    </button>
                    <div className="flex items-center gap-2">
                        {stepIndex > 0 && (
                            <button type="button" onClick={onPrev}
                                className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-600 text-slate-300 hover:bg-navy-700 cursor-pointer transition-colors">
                                Back
                            </button>
                        )}
                        <button type="button" onClick={onNext}
                            className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg bg-blue-300 text-slate-900 hover:bg-blue-200 cursor-pointer transition-colors">
                            {isLast ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>

            {pos && pos.placement === 'above' && <Arrow direction="down" offset={pos.arrowOffset} horizontal />}
            {pos && pos.placement === 'left' && <Arrow direction="right" offset={pos.arrowOffset} horizontal={false} />}
        </div>
    );
}

function Arrow({ direction, offset, horizontal }: { direction: 'up' | 'down' | 'left' | 'right'; offset: number; horizontal: boolean }): React.ReactElement {
    var style: React.CSSProperties = {};

    if (horizontal) {
        // Arrow on top or bottom edge
        style.left = offset - ARROW_SIZE;
        if (direction === 'up') {
            style.top = -ARROW_SIZE;
            style.borderLeft = ARROW_SIZE + 'px solid transparent';
            style.borderRight = ARROW_SIZE + 'px solid transparent';
            style.borderBottom = ARROW_SIZE + 'px solid #202b43';
        } else {
            style.bottom = -ARROW_SIZE;
            style.borderLeft = ARROW_SIZE + 'px solid transparent';
            style.borderRight = ARROW_SIZE + 'px solid transparent';
            style.borderTop = ARROW_SIZE + 'px solid #202b43';
        }
    } else {
        // Arrow on left or right edge
        style.top = offset - ARROW_SIZE;
        if (direction === 'left') {
            style.left = -ARROW_SIZE;
            style.borderTop = ARROW_SIZE + 'px solid transparent';
            style.borderBottom = ARROW_SIZE + 'px solid transparent';
            style.borderRight = ARROW_SIZE + 'px solid #202b43';
        } else {
            style.right = -ARROW_SIZE;
            style.borderTop = ARROW_SIZE + 'px solid transparent';
            style.borderBottom = ARROW_SIZE + 'px solid transparent';
            style.borderLeft = ARROW_SIZE + 'px solid #202b43';
        }
    }

    style.width = 0;
    style.height = 0;
    style.position = 'absolute';

    return React.createElement('div', { style: style });
}
