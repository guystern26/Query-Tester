import React from 'react';
import layout from '@splunk/react-page';
import { AppShell } from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

document.documentElement.classList.add('dark');

// Remove HTML loading overlay once JS is running
const el = document.getElementById('qt-loading');
if (el) el.remove();

layout(<AppShell />, { theme: 'dark' });
