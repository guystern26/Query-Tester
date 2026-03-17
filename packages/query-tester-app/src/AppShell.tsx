import React, { useState, useEffect, useCallback } from 'react';
import { StartPage } from './StartPage';
import { LibraryPage } from './features/library';
import { SetupPage } from './features/setup/SetupPage';
import { useTestStore } from 'core/store/testStore';

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

    useEffect(() => {
        const el = document.getElementById('qt-loading');
        if (el) el.remove();
    }, []);

    useEffect(() => {
        const { fetchConfigStatus, fetchCommandPolicy } = useTestStore.getState();
        void fetchConfigStatus();
        void fetchCommandPolicy();
    }, []);

    useEffect(() => {
        const handler = () => setRoute(getRoute());
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const navigateTo = useCallback((target: string) => {
        window.location.hash = target;
    }, []);

    if (route.page === 'setup') {
        return <SetupPage onNavigateBack={() => navigateTo('library')} />;
    }
    if (route.page === 'tester') {
        return <StartPage onNavigateLibrary={() => navigateTo('library')} loadTestId={route.testId} />;
    }
    return (
        <LibraryPage
            onNavigateBuilder={(testId?: string) => {
                navigateTo(testId ? 'tester?test_id=' + encodeURIComponent(testId) : 'tester');
            }}
        />
    );
}
