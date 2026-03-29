import React from 'react';
import layout from '@splunk/react-page';
import { StartPage } from '@splunk/query-tester-app';
import '@splunk/query-tester-app/src/globals.css';

document.documentElement.classList.add('dark');

layout(<StartPage mode="ide" />, { theme: 'dark' });

// Remove the loading overlay once React has mounted
const loadingEl = document.getElementById('qt-loading');
if (loadingEl) loadingEl.remove();
