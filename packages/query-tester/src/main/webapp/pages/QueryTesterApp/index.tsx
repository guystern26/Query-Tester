import React from 'react';
import layout from '@splunk/react-page';
import { AppShell } from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

document.documentElement.classList.add('dark');

layout(<AppShell />, { theme: 'dark' });
