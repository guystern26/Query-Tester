/**
 * DestinationActions — IDE action buttons: Continue to Builder, Open in Splunk.
 */
import React, { useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

const TRANSFER_KEY = 'qt_ide_transfer';

export function DestinationActions(): React.ReactElement {
    const test = useTestStore(selectActiveTest);
    const appConfig = useTestStore((s) => s.appConfig);

    const spl = test?.query?.spl ?? '';
    const app = test?.app ?? '';
    const name = test?.name ?? '';
    const timeRange = test?.query?.timeRange;

    const splunkWebUrl = (appConfig?.splunkWebUrl || window.location.origin).replace(/\/+$/, '');

    const handleContinueToBuilder = useCallback(() => {
        const transfer = { spl, app, name, action: 'continue', timestamp: Date.now(), timeRange: timeRange || undefined };
        localStorage.setItem(TRANSFER_KEY, JSON.stringify(transfer));
        window.location.href = '/app/QueryTester/QueryTesterApp#tester';
    }, [spl, app, name]);

    const handleOpenInApp = useCallback(() => {
        if (!splunkWebUrl || !app) return;
        const params = new URLSearchParams({ q: spl });
        if (timeRange?.earliest) params.set('earliest', timeRange.earliest);
        if (timeRange?.latest) params.set('latest', timeRange.latest);
        window.open(splunkWebUrl + '/app/' + encodeURIComponent(app) + '/search?' + params.toString(), '_blank');
    }, [splunkWebUrl, spl, app, timeRange]);

    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={handleContinueToBuilder}
                disabled={!spl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-400 hover:bg-blue-300 text-slate-900 border border-transparent cursor-pointer transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Continue to Builder
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <button
                type="button"
                onClick={handleOpenInApp}
                disabled={!spl.trim() || !app}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-transparent border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200 cursor-pointer transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Open in {app || 'Splunk'} App
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            </button>
        </div>
    );
}
