/**
 * useAceMarkers — apply inline markers, gutter annotations, and hover
 * tooltips to the Ace editor that lives inside a container div.
 */
import { useEffect, useRef } from 'react';
import type { SplWarning } from './splLinter';
import { MARKER_CLASSES, injectCss, showTooltip, removeTooltip } from './aceMarkerStyles';

/** Minimal Ace typings — just what we use. */
interface AceRange {
    new (startRow: number, startCol: number, endRow: number, endCol: number): AceRange;
}
interface AceSession {
    addMarker(range: AceRange, cls: string, type: string, inFront?: boolean): number;
    removeMarker(id: number): void;
    setAnnotations(
        annotations: Array<{ row: number; column: number; text: string; type: string }>,
    ): void;
    clearAnnotations(): void;
    doc: {
        indexToPosition(index: number, startRow?: number): { row: number; column: number };
    };
}
interface AceEditor {
    session: AceSession;
    renderer: {
        textToScreenCoordinates(
            row: number,
            column: number,
        ): { pageX: number; pageY: number };
        $cursorLayer: {
            getPixelPosition(
                pos: { row: number; column: number },
                onScreen?: boolean,
            ): { left: number; top: number };
        };
        scroller: HTMLElement;
        lineHeight: number;
    };
    container: HTMLElement;
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
        const annotations: Array<{
            row: number;
            column: number;
            text: string;
            type: string;
        }> = [];

        for (const w of warnings) {
            const startPos = session.doc.indexToPosition(w.start, 0);
            const endPos = session.doc.indexToPosition(w.end, 0);
            const cls = MARKER_CLASSES[w.severity] || MARKER_CLASSES.warning;
            const range = new RangeCtor(
                startPos.row,
                startPos.column,
                endPos.row,
                endPos.column,
            );
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
            if (!pos) {
                removeTooltip(tooltipRef);
                return;
            }

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
        const pos = (editor as any).renderer.screenToTextCoordinates(
            e.clientX,
            e.clientY,
        );
        if (pos && typeof pos.row === 'number') return pos;
    } catch {
        /* fall through */
    }
    return null;
}

function docPosToIndex(
    editor: AceEditor,
    pos: { row: number; column: number },
): number {
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
