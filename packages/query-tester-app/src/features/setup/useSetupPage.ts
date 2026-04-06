import { useEffect, useRef } from 'react';
import { useTestStore } from 'core/store/testStore';

/**
 * Page-level hook for SetupPage. Loads config + runs email auto-detect on mount.
 */
export function useSetupPage() {
    const fetchAppConfig = useTestStore((s) => s.fetchAppConfig);
    const detectEmailConfig = useTestStore((s) => s.detectEmailConfig);
    const appConfig = useTestStore((s) => s.appConfig);
    const isLoadingConfig = useTestStore((s) => s.isLoadingConfig);
    const configError = useTestStore((s) => s.configError);
    const didInit = useRef(false);

    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        void fetchAppConfig();
    }, [fetchAppConfig]);

    return { appConfig, isLoadingConfig, configError };
}
