import React, { useState, useEffect, useCallback } from 'react';
import { StartPage } from './StartPage';
import { LibraryPage } from './features/library';

type Page = 'library' | 'tester';

function getRoute(): { page: Page; testId?: string } {
    // Check hash first (client-side nav)
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('tester')) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        return { page: 'tester', testId: params.get('test_id') || undefined };
    }
    // Check URL query param (initial load from old Library link)
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('test_id');
    if (testId) {
        return { page: 'tester', testId };
    }
    // Default to library
    if (!hash || hash === 'library') return { page: 'library' };
    return { page: 'library' };
}

export function AppShell() {
    const [route, setRoute] = useState(getRoute);

    // Remove the HTML loading overlay once React is rendering
    useEffect(() => {
        const el = document.getElementById('qt-loading');
        if (el) el.remove();
    }, []);

    useEffect(() => {
        const handler = () => setRoute(getRoute());
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const navigateTo = useCallback((target: string) => {
        window.location.hash = target;
    }, []);

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
