import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StartPage } from './StartPage';
import { LibraryPage } from './features/library';
import { SetupPage } from './features/setup/SetupPage';
import { useTestStore } from 'core/store/testStore';
import { UnsavedChangesModal } from './features/layout/UnsavedChangesModal';
import { SaveTestModal } from './components/test-navigation/SaveTestModal';

type Page = 'library' | 'tester' | 'setup';

/** Navigate to a hash target, stripping stale ?test_id= from the URL bar. */
function setHash(target: string): void {
    if (window.location.search.includes('test_id')) {
        window.history.replaceState(null, '', window.location.pathname + '#' + target);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
        window.location.hash = target;
    }
}

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

/** Returns true only when the builder has unsaved work worth prompting about. */
function shouldGuardNavigation(): boolean {
    const { hasUnsavedChanges, savedTestId, tests, activeTestId } = useTestStore.getState();
    if (!hasUnsavedChanges) return false;
    // Saved test with edits — always worth prompting
    if (savedTestId) return true;
    // New test — only prompt if meaningful content exists (at least an app selected)
    const activeTest = tests.find((t) => t.id === activeTestId);
    return Boolean(activeTest && activeTest.app);
}

export function AppShell(): React.ReactElement {
    const [route, setRoute] = useState(getRoute);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);
    const suppressGuardRef = useRef(false);

    useEffect(() => {
        const el = document.getElementById('qt-loading');
        if (el) el.remove();
    }, []);

    useEffect(() => { const s = useTestStore.getState(); void s.fetchConfigStatus(); void s.fetchCommandPolicy(); }, []);

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
            const newRoute = getRoute();
            if (shouldGuardNavigation() && route.page === 'tester' && newRoute.page !== 'tester') {
                window.history.replaceState(null, '', '#tester');
                setPendingTarget(newRoute.page);
                return;
            }
            setRoute(newRoute);
        };
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, [route.page]);

    const navigateTo = useCallback((target: string) => {
        if (shouldGuardNavigation() && route.page === 'tester') {
            setPendingTarget(target);
            return;
        }
        setHash(target);
    }, [route.page]);

    const handleDiscardAndLeave = useCallback(() => {
        if (!pendingTarget) return;
        const target = pendingTarget;
        setPendingTarget(null);
        // Reset builder to a clean slate — unsaved new tests are gone,
        // saved tests keep their library version but the builder clears.
        useTestStore.getState().resetToNewTest();
        suppressGuardRef.current = true;
        setHash(target);
    }, [pendingTarget]);

    const handleStayOnPage = useCallback(() => {
        setPendingTarget(null);
    }, []);

    const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    const handleSaveAndLeave = useCallback(() => {
        if (!pendingTarget) return;
        const state = useTestStore.getState();
        if (state.savedTestId) {
            // Already saved — update directly and leave
            const activeTest = state.tests.find((t) => t.id === state.activeTestId);
            const testName = activeTest?.name || 'Untitled Test';
            setIsSavingBeforeLeave(true);
            state.updateSavedTest(state.savedTestId, testName, '').then(() => {
                const target = pendingTarget;
                setPendingTarget(null);
                setIsSavingBeforeLeave(false);
                suppressGuardRef.current = true;
                setHash(target);
            }).catch(() => {
                setIsSavingBeforeLeave(false);
            });
        } else {
            // New test — show the save modal so user can name it
            setShowSaveModal(true);
        }
    }, [pendingTarget]);

    const handleSaveModalNew = useCallback(async (name: string, description: string) => {
        setIsSavingBeforeLeave(true);
        try {
            await useTestStore.getState().saveCurrentTest(name, description);
            setShowSaveModal(false);
            const target = pendingTarget;
            setPendingTarget(null);
            setIsSavingBeforeLeave(false);
            suppressGuardRef.current = true;
            if (target) setHash(target);
        } catch {
            setIsSavingBeforeLeave(false);
        }
    }, [pendingTarget]);

    const handleSaveModalClose = useCallback(() => {
        setShowSaveModal(false);
    }, []);

    const saveModalInitialName = (() => {
        const state = useTestStore.getState();
        const activeTest = state.tests.find((t) => t.id === state.activeTestId);
        return activeTest?.name || '';
    })();

    return (
        <>
            {pendingTarget && !showSaveModal && (
                <UnsavedChangesModal
                    onDiscard={handleDiscardAndLeave}
                    onStay={handleStayOnPage}
                    onSave={handleSaveAndLeave}
                    isSaving={isSavingBeforeLeave}
                />
            )}
            <SaveTestModal
                open={showSaveModal}
                onClose={handleSaveModalClose}
                initialName={saveModalInitialName}
                savedTestId={null}
                isSaving={isSavingBeforeLeave}
                onSaveNew={handleSaveModalNew}
                onUpdate={() => {}}
            />
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
