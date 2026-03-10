import React from 'react';
import layout from '@splunk/react-page';
import QueryTesterApp from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

// Force dark mode regardless of user's Splunk theme preference
document.documentElement.classList.add('dark');

layout(
    <QueryTesterApp />,
    {
        theme: 'dark',
    }
);
