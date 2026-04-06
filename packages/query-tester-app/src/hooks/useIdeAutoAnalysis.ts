/**
 * useIdeAutoAnalysis — Debounced auto-analysis trigger for IDE mode.
 * Fires analyzeQuery when SPL, app, or user context changes.
 */
import { useMemo, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { useTestStore } from 'core/store/testStore';

const DEBOUNCE_MS = 800;

export function useIdeAutoAnalysis(isIde: boolean, spl: string, app: string, hasApp: boolean): void {
    const analyzeQuery = useTestStore((s) => s.analyzeQuery);
    const ideUserContext = useTestStore((s) => s.ideUserContext);

    const debouncedAnalyze = useMemo(
        () => debounce((splVal: string, appVal: string, ctx: string) => {
            if (splVal.trim()) analyzeQuery(splVal, appVal, ctx);
        }, DEBOUNCE_MS),
        [analyzeQuery],
    );

    useEffect(() => () => { debouncedAnalyze.cancel(); }, [debouncedAnalyze]);

    useEffect(() => {
        if (isIde && hasApp) debouncedAnalyze(spl, app, ideUserContext);
    }, [isIde, hasApp, spl, app, ideUserContext, debouncedAnalyze]);
}
