import React from 'react';
import layout from '@splunk/react-page';
import QueryTesterApp from '@splunk/query-tester-app';
import { getUserTheme } from '@splunk/splunk-utils/themes';
import '@splunk/query-tester-app/src/globals.css';

getUserTheme()
    .then((theme) => {
        layout(
            <QueryTesterApp />,
            {
                theme,
            }
        );
    })
    .catch((e) => {
        const errorEl = document.createElement('span');
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
