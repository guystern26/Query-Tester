/**
 * useAnalysisMarkers — Converts IDE analysis notes with line numbers
 * into Ace editor annotations (gutter icons + tooltips).
 */
import { useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';

interface AceAnnotation {
    row: number;
    column: number;
    text: string;
    type: 'error' | 'warning' | 'info';
}

interface AceSession {
    setAnnotations(annotations: AceAnnotation[]): void;
    getAnnotations(): AceAnnotation[];
}

interface AceEditor {
    session: AceSession;
}

function getAceEditor(container: HTMLElement | null): AceEditor | null {
    if (!container) return null;
    const el = container.querySelector('.ace_editor') as HTMLElement | null;
    if (!el) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (el as any).env?.editor ?? null;
}

const SEVERITY_MAP: Record<string, 'error' | 'warning' | 'info'> = {
    error: 'error',
    warning: 'warning',
    info: 'info',
};

/**
 * Applies analysis notes as Ace gutter annotations on the editor
 * inside the given container. Only notes with a non-null `line` are applied.
 * Merges with existing annotations (from useAceMarkers) to avoid overwriting.
 */
export function useAnalysisMarkers(
    containerRef: React.RefObject<HTMLElement | null>,
): void {
    const analysisNotes = useTestStore((s) => s.analysisNotes);

    useEffect(() => {
        const editor = getAceEditor(containerRef.current);
        if (!editor) return;

        const notesWithLine = analysisNotes.filter((n) => n.line !== null && n.line !== undefined);
        if (notesWithLine.length === 0) return;

        // Read existing annotations (from linter/useAceMarkers) and merge
        const existing = editor.session.getAnnotations() || [];
        const analysisAnnotations: AceAnnotation[] = notesWithLine.map((n) => ({
            row: (n.line as number) - 1, // Ace uses 0-based rows
            column: 0,
            text: `[${n.category}] ${n.message}`,
            type: SEVERITY_MAP[n.severity] || 'info',
        }));

        editor.session.setAnnotations([...existing, ...analysisAnnotations]);

        return () => {
            // On cleanup, remove our annotations (restore only existing ones)
            const current = editor.session.getAnnotations() || [];
            const cleaned = current.filter(
                (a) => !analysisAnnotations.some(
                    (aa) => aa.row === a.row && aa.text === a.text,
                ),
            );
            editor.session.setAnnotations(cleaned);
        };
    }, [analysisNotes, containerRef]);
}
