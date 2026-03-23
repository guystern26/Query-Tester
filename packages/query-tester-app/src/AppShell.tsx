import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StartPage } from './StartPage';
import { LibraryPage } from './features/library';
import { SetupPage } from './features/setup/SetupPage';
import { useTestStore } from 'core/store/testStore';
import { UnsavedChangesModal } from './features/layout/UnsavedChangesModal';

type Page = 'library' | 'tester' | 'setup';

function getRoute(): { page: Page; testId?: string } {
    const hash = window.location.hash.replace('#', '');
    // Hash takes priority — once the user navigates away, respect it
    if (hash === 'setup') return { page: 'setup' };
    if (hash === 'library') return { page: 'library' };
    if (hash.startsWith('tester')) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        return { page: 'tester', testId: params.get('test_id') || undefined };
    }
    // No hash set yet — check URL query params (e.g. email link with ?test_id=)
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('test_id');
    if (testId) return { page: 'tester', testId };
    return { page: 'library' };
}

export function AppShell() {
    const [route, setRoute] = useState(getRoute);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);
    const suppressGuardRef = useRef(false);

    useEffect(() => {
        const el = document.getElementById('qt-loading');
        if (el) el.remove();
    }, []);

    useEffect(() => {
        const { fetchConfigStatus, fetchCommandPolicy } = useTestStore.getState();
        void fetchConfigStatus();
        void fetchCommandPolicy();
    }, []);

    // Browser tab close / refresh guard
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            const { hasUnsavedChanges } = useTestStore.getState();
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // Hash change handler — intercept if unsaved
    useEffect(() => {
        const handler = () => {
            if (suppressGuardRef.current) {
                suppressGuardRef.current = false;
                setRoute(getRoute());
                return;
            }
            const { hasUnsavedChanges } = useTestStore.getState();
            const newRoute = getRoute();
            if (hasUnsavedChanges && route.page === 'tester' && newRoute.page !== 'tester') {
                // Revert hash to stay on tester, show modal
                window.history.replaceState(null, '', '#tester');
                setPendingTarget(window.location.hash === '#tester' ? newRoute.page : newRoute.page);
                return;
            }
            setRoute(newRoute);
        };
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, [route.page]);

    const navigateTo = useCallback((target: string) => {
        const { hasUnsavedChanges } = useTestStore.getState();
        if (hasUnsavedChanges && route.page === 'tester') {
            setPendingTarget(target);
            return;
        }
        window.location.hash = target;
    }, [route.page]);

    const handleDiscardAndLeave = useCallback(() => {
        if (!pendingTarget) return;
        const target = pendingTarget;
        setPendingTarget(null);
        useTestStore.setState({ hasUnsavedChanges: false });
        suppressGuardRef.current = true;
        window.location.hash = target;
    }, [pendingTarget]);

    const handleStayOnPage = useCallback(() => {
        setPendingTarget(null);
    }, []);

    return (
        <>
            {pendingTarget && (
                <UnsavedChangesModal
                    onDiscard={handleDiscardAndLeave}
                    onStay={handleStayOnPage}
                />
            )}
            {route.page === 'setup' ? (
                <SetupPage onNavigateBack={() => navigateTo('library')} />
            ) : route.page === 'tester' ? (
                <StartPage onNavigateLibrary={() => navigateTo('library')} loadTestId={route.testId} />
            ) : (
                <LibraryPage
                    onNavigateBuilder={(testId?: string) => {
                        navigateTo(testId ? 'tester?test_id=' + encodeURIComponent(testId) : 'tester');
                    }}
                />
            )}
        </>
    );
}
