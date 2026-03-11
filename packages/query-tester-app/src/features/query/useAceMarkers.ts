/**
 * useAceMarkers — apply inline markers and gutter annotations to the Ace
 * editor that lives inside a container div.
 *
 * Markers are coloured underlines drawn directly on the editor text.
 * Annotations are gutter icons whose native Ace tooltip shows the message.
 *
 * Also attaches a mousemove listener so hovering a marked token shows a
 * floating tooltip inside the editor.
 */
import { useEffect, useRef } from 'react';
import type { SplWarning } from './splLinter';

/** Minimal Ace typings — just what we use. */
interface AceRange {
  new (startRow: number, startCol: number, endRow: number, endCol: number): AceRange;
}
interface AceSession {
  addMarker(range: AceRange, cls: string, type: string, inFront?: boolean): number;
  removeMarker(id: number): void;
  setAnnotations(annotations: Array<{ row: number; column: number; text: string; type: string }>): void;
  clearAnnotations(): void;
  doc: { indexToPosition(index: number, startRow?: number): { row: number; column: number } };
}
interface AceEditor {
  session: AceSession;
  renderer: {
    textToScreenCoordinates(row: number, column: number): { pageX: number; pageY: number };
    $cursorLayer: { getPixelPosition(pos: { row: number; column: number }, onScreen?: boolean): { left: number; top: number } };
    scroller: HTMLElement;
    lineHeight: number;
  };
  container: HTMLElement;
}

const MARKER_CLASSES: Record<string, string> = {
  error: 'spl-lint-error',
  warning: 'spl-lint-warning',
  info: 'spl-lint-info',
};

/** Inject the marker CSS once. */
let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
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
      border-bottom: 2px dashed rgba(96,165,250,0.6);
      border-radius: 2px;
      z-index: 4;
    }
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
  `;
  document.head.appendChild(style);
}

function getAceEditor(container: HTMLElement | null): AceEditor | null {
  if (!container) return null;
  const el = container.querySelector('.ace_editor') as HTMLElement | null;
  if (!el) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (el as any).env?.editor ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AceRange(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ace = (window as any).ace;
  if (!ace) return null;
  try {
    return ace.require('ace/range').Range;
  } catch {
    return null;
  }
}

export function useAceMarkers(
  containerRef: React.RefObject<HTMLElement | null>,
  warnings: SplWarning[],
) {
  const markerIds = useRef<number[]>([]);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    injectCss();
  }, []);

  useEffect(() => {
    const editor = getAceEditor(containerRef.current);
    if (!editor) return;

    const session = editor.session;
    const RangeCtor = AceRange();

    // ── Clean previous markers ─────────────────────────────────
    for (const id of markerIds.current) {
      session.removeMarker(id);
    }
    markerIds.current = [];
    session.clearAnnotations();

    if (!warnings.length || !RangeCtor) {
      removeTooltip(tooltipRef);
      return;
    }

    // ── Add markers + annotations ──────────────────────────────
    const annotations: Array<{ row: number; column: number; text: string; type: string }> = [];

    for (const w of warnings) {
      const startPos = session.doc.indexToPosition(w.start, 0);
      const endPos = session.doc.indexToPosition(w.end, 0);
      const cls = MARKER_CLASSES[w.severity] || MARKER_CLASSES.warning;
      const range = new RangeCtor(startPos.row, startPos.column, endPos.row, endPos.column);
      const id = session.addMarker(range, cls, 'text', true);
      markerIds.current.push(id);

      annotations.push({
        row: startPos.row,
        column: startPos.column,
        text: w.message,
        type: w.severity === 'error' ? 'error' : 'warning',
      });
    }

    session.setAnnotations(annotations);

    // ── Hover tooltip ──────────────────────────────────────────
    const scroller = editor.renderer.scroller;

    function onMouseMove(e: MouseEvent) {
      if (!editor) return;
      const pos = screenToDocPos(editor, e);
      if (!pos) { removeTooltip(tooltipRef); return; }

      const charIndex = docPosToIndex(editor, pos);
      const hit = warnings.find((w) => charIndex >= w.start && charIndex < w.end);

      if (!hit) {
        removeTooltip(tooltipRef);
        return;
      }

      showTooltip(tooltipRef, scroller, e, hit);
    }

    function onMouseLeave() {
      removeTooltip(tooltipRef);
    }

    scroller.addEventListener('mousemove', onMouseMove);
    scroller.addEventListener('mouseleave', onMouseLeave);

    return () => {
      scroller.removeEventListener('mousemove', onMouseMove);
      scroller.removeEventListener('mouseleave', onMouseLeave);
      removeTooltip(tooltipRef);
    };
  }, [warnings, containerRef]);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function screenToDocPos(
  editor: AceEditor,
  e: MouseEvent,
): { row: number; column: number } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos = (editor as any).renderer.screenToTextCoordinates(e.clientX, e.clientY);
    if (pos && typeof pos.row === 'number') return pos;
  } catch { /* fall through */ }
  return null;
}

function docPosToIndex(editor: AceEditor, pos: { row: number; column: number }): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = (editor.session as any).doc;
  if (doc.positionToIndex) return doc.positionToIndex(pos, 0);
  // Manual fallback
  const lines: string[] = doc.getAllLines();
  let idx = 0;
  for (let r = 0; r < pos.row && r < lines.length; r++) {
    idx += lines[r].length + 1; // +1 for newline
  }
  idx += pos.column;
  return idx;
}

function showTooltip(
  ref: React.MutableRefObject<HTMLDivElement | null>,
  scroller: HTMLElement,
  e: MouseEvent,
  warning: SplWarning,
) {
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

function removeTooltip(ref: React.MutableRefObject<HTMLDivElement | null>) {
  if (ref.current) {
    ref.current.style.display = 'none';
  }
}
