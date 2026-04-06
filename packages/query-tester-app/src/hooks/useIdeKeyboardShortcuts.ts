/**
 * useIdeKeyboardShortcuts — Global keyboard shortcuts for IDE mode.
 * Ctrl/Cmd+Enter: run query (with dangerous command check). Escape: blur.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { findDangerousCommands } from '../features/query/ideCommandPolicy';

interface IdeShortcutState {
    dangerousCommands: string[];
    confirmDangerous: () => void;
    cancelDangerous: () => void;
}

export function useIdeKeyboardShortcuts(isIde: boolean): IdeShortcutState {
    const runIdeQuery = useTestStore((s) => s.runIdeQuery);
    const cancelIdeRun = useTestStore((s) => s.cancelIdeRun);
    const ideRunning = useTestStore((s) => s.ideRunning);
    const ideUserContext = useTestStore((s) => s.ideUserContext);
    const analysisNotes = useTestStore((s) => s.analysisNotes);
    const test = useTestStore(selectActiveTest);
    const [dangerousCommands, setDangerousCommands] = useState<string[]>([]);

    const executeQuery = useCallback(() => {
        const spl = test?.query?.spl ?? '';
        const app = test?.app ?? '';
        if (!spl.trim()) return;
        const timeRange = test?.query?.timeRange;
        const tr = timeRange ? { earliest: timeRange.earliest || '0', latest: timeRange.latest || 'now' } : undefined;
        const prior = analysisNotes.map((n) => ({ severity: n.severity, category: n.category, message: n.message }));
        void runIdeQuery(spl, app, tr, ideUserContext || undefined, prior.length > 0 ? prior : undefined, true);
    }, [test, analysisNotes, ideUserContext, runIdeQuery]);

    const confirmDangerous = useCallback(() => { setDangerousCommands([]); executeQuery(); }, [executeQuery]);
    const cancelDangerous = useCallback(() => { setDangerousCommands([]); }, []);

    useEffect(() => {
        if (!isIde) return;
        function handleKeyDown(e: KeyboardEvent): void {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (ideRunning) { cancelIdeRun(); return; }
                const spl = test?.query?.spl ?? '';
                if (!spl.trim()) return;
                const dangerous = findDangerousCommands(spl);
                if (dangerous.length > 0) { setDangerousCommands(dangerous); return; }
                executeQuery();
                return;
            }
            if (e.key === 'Escape') {
                if (dangerousCommands.length > 0) { setDangerousCommands([]); return; }
                const el = document.activeElement;
                if (el instanceof HTMLElement) el.blur();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => { document.removeEventListener('keydown', handleKeyDown); };
    }, [isIde, ideRunning, test, dangerousCommands, cancelIdeRun, executeQuery]);

    return { dangerousCommands, confirmDangerous, cancelDangerous };
}
