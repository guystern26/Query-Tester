/**
 * aceMarkerStyles — CSS injection, marker class names, and tooltip helpers
 * for the SPL linter's Ace editor integration.
 *
 * Extracted from useAceMarkers to keep each module under 200 lines.
 */
import type { SplWarning } from './splLinter';

// ── Marker class names ──────────────────────────────────────────────────────────

export const MARKER_CLASSES: Record<string, string> = {
    error: 'spl-lint-error',
    warning: 'spl-lint-warning',
    info: 'spl-lint-info',
};

/** Returns the CSS class for a field-tracking marker by color index. */
export function fieldMarkerClass(colorIndex: number): string {
    return 'spl-field-' + (colorIndex % 10);
}

// ── CSS injection ───────────────────────────────────────────────────────────────

const MARKER_CSS = `
    .spl-lint-warning {
      position: absolute;
      background: rgba(250,204,21,0.25);
      border-bottom: 2px solid #facc15;
      border-radius: 2px;
      z-index: 4;
    }
    .spl-lint-error {
      position: absolute;
      background: rgba(248,113,113,0.25);
      border-bottom: 2px solid #f87171;
      border-radius: 2px;
      z-index: 4;
    }
    .spl-lint-info {
      position: absolute;
      background: rgba(96,165,250,0.15);
      border-bottom: 2px dotted rgba(96,165,250,0.6);
      border-radius: 2px;
      z-index: 4;
    }
    .spl-lint-blocked {
      border-bottom-style: dashed !important;
    }
    .spl-field-0 { position:absolute; background:rgba(59,130,246,0.18); border-radius:2px; z-index:3; }
    .spl-field-1 { position:absolute; background:rgba(34,197,94,0.18); border-radius:2px; z-index:3; }
    .spl-field-2 { position:absolute; background:rgba(245,158,11,0.18); border-radius:2px; z-index:3; }
    .spl-field-3 { position:absolute; background:rgba(236,72,153,0.18); border-radius:2px; z-index:3; }
    .spl-field-4 { position:absolute; background:rgba(168,85,247,0.18); border-radius:2px; z-index:3; }
    .spl-field-5 { position:absolute; background:rgba(249,115,22,0.18); border-radius:2px; z-index:3; }
    .spl-field-6 { position:absolute; background:rgba(20,184,166,0.18); border-radius:2px; z-index:3; }
    .spl-field-7 { position:absolute; background:rgba(139,92,246,0.18); border-radius:2px; z-index:3; }
    .spl-field-8 { position:absolute; background:rgba(52,211,153,0.18); border-radius:2px; z-index:3; }
    .spl-field-9 { position:absolute; background:rgba(251,113,133,0.18); border-radius:2px; z-index:3; }
    .spl-lint-tooltip {
      position: absolute;
      z-index: 1000;
      max-width: 360px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.4;
      pointer-events: none;
      white-space: pre-wrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .spl-lint-tooltip.warning {
      background: #422006;
      border: 1px solid #854d0e;
      color: #fef08a;
    }
    .spl-lint-tooltip.error {
      background: #450a0a;
      border: 1px solid #991b1b;
      color: #fca5a5;
    }
    .spl-lint-tooltip.info {
      background: #172554;
      border: 1px solid #1e40af;
      color: #93c5fd;
    }
    .spl-lint-tooltip.field {
      background: #1e293b;
      border: 1px solid #475569;
      color: #e2e8f0;
    }
`;

let cssInjected = false;

export function injectCss(): void {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = MARKER_CSS;
    document.head.appendChild(style);
}

// ── Tooltip helpers ─────────────────────────────────────────────────────────────

export function showTooltip(
    ref: React.MutableRefObject<HTMLDivElement | null>,
    scroller: HTMLElement,
    e: MouseEvent,
    warning: SplWarning,
): void {
    if (!ref.current) {
        ref.current = document.createElement('div');
        ref.current.className = 'spl-lint-tooltip';
        document.body.appendChild(ref.current);
    }

    const tip = ref.current;
    tip.textContent = warning.message;
    tip.className = `spl-lint-tooltip ${warning.severity}`;
    tip.style.display = 'block';
    tip.style.left = `${e.pageX + 12}px`;
    tip.style.top = `${e.pageY + 16}px`;
}

export function removeTooltip(ref: React.MutableRefObject<HTMLDivElement | null>): void {
    if (ref.current) {
        ref.current.style.display = 'none';
    }
}
