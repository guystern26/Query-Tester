import React from 'react';
import layout from '@splunk/react-page';
import { SuitesPage } from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

document.documentElement.classList.add('dark');

function navigateTo(view: string) {
    const base = window.location.pathname.replace(/\/[^/]*$/, '');
    window.location.href = base + '/' + view;
}

layout(
    <SuitesPage
        onNavigateLibrary={() => navigateTo('TestLibrary')}
        onNavigateBuilder={() => navigateTo('QueryTesterApp')}
    />,
    { theme: 'dark' }
);
