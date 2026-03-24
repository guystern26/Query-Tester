/**
 * TutorialSpotlight — dark overlay with a pulsing cutout around the target element.
 *
 * Uses an SVG mask to punch a rounded-rect hole over the highlighted element.
 * The hole pulses via a CSS animation defined inline (no tailwind keyframes needed).
 */
import React, { useEffect, useState } from 'react';

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface TutorialSpotlightProps {
    /** CSS selector for the element to highlight */
    selector: string;
    /** Extra padding around the target element (px) */
    padding?: number;
    /** Border radius of the cutout (px) */
    borderRadius?: number;
    /** Called when the user clicks the overlay (outside the target) */
    onOverlayClick?: () => void;
}

const PADDING_DEFAULT = 8;
const BORDER_RADIUS_DEFAULT = 8;
const REFLOW_INTERVAL_MS = 200;

/** Try each comma-separated selector individually so the first selector wins, not DOM order. */
function queryFirst(selector: string): Element | null {
    for (const part of selector.split(',')) {
        const el = document.querySelector(part.trim());
        if (el) return el;
    }
    return null;
}

function getTargetRect(selector: string): TargetRect | null {
    const el = queryFirst(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function TutorialSpotlight({
    selector,
    padding = PADDING_DEFAULT,
    borderRadius = BORDER_RADIUS_DEFAULT,
    onOverlayClick,
}: TutorialSpotlightProps): React.ReactElement {
    const [rect, setRect] = useState<TargetRect | null>(null);

    useEffect(() => {
        const update = () => setRect(getTargetRect(selector));
        update();

        // Re-measure on scroll, resize, and periodically (layout shifts)
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        const interval = setInterval(update, REFLOW_INTERVAL_MS);

        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
            clearInterval(interval);
        };
    }, [selector]);

    // Viewport dimensions for the SVG overlay
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Cutout coordinates (padded)
    const cx = rect ? rect.left - padding : 0;
    const cy = rect ? rect.top - padding : 0;
    const cw = rect ? rect.width + padding * 2 : 0;
    const ch = rect ? rect.height + padding * 2 : 0;

    return (
        <div
            className="fixed inset-0 z-[9990]"
            style={{ pointerEvents: 'auto' }}
            onClick={onOverlayClick}
        >
            {/* Inline keyframes — no tailwind config needed */}
            <style>{`
                @keyframes tutorial-pulse {
                    0%, 100% { opacity: 0.65; }
                    50%      { opacity: 0.45; }
                }
            `}</style>

            <svg
                className="absolute inset-0"
                width={vw}
                height={vh}
                style={{ animation: 'tutorial-pulse 2s ease-in-out infinite' }}
            >
                <defs>
                    <mask id="tutorial-spotlight-mask">
                        {/* White = visible overlay */}
                        <rect x="0" y="0" width={vw} height={vh} fill="white" />
                        {/* Black = transparent cutout */}
                        {rect && (
                            <rect
                                x={cx}
                                y={cy}
                                width={cw}
                                height={ch}
                                rx={borderRadius}
                                ry={borderRadius}
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width={vw}
                    height={vh}
                    fill="#0a1628"
                    mask="url(#tutorial-spotlight-mask)"
                />
            </svg>

            {/* Glowing border ring around cutout */}
            {rect && (
                <div
                    className="absolute border-2 border-btnprimary/60 shadow-[0_0_15px_rgba(96,165,250,0.3)]"
                    style={{
                        top: cy,
                        left: cx,
                        width: cw,
                        height: ch,
                        borderRadius,
                        pointerEvents: 'none',
                    }}
                />
            )}
        </div>
    );
}
