import React from 'react';
import layout from '@splunk/react-page';
import { LibraryPage } from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

document.documentElement.classList.add('dark');

function navigateTo(view: string) {
    const base = window.location.pathname.replace(/\/[^/]*$/, '');
    window.location.href = base + '/' + view;
}

layout(
    <LibraryPage
        onNavigateBuilder={(testId?: string) => {
            const url = testId
                ? 'QueryTesterApp?test_id=' + encodeURIComponent(testId)
                : 'QueryTesterApp';
            navigateTo(url);
        }}
    />,
    { theme: 'dark' }
);
