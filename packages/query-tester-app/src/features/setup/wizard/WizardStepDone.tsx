import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';

export interface WizardStepDoneProps {
    emailConfigured: boolean;
}

export function WizardStepDone({ emailConfigured }: WizardStepDoneProps) {
    const fetchConfigStatus = useTestStore((s) => s.fetchConfigStatus);
    const [isLoading, setIsLoading] = useState(false);

    const handleGetStarted = useCallback(async () => {
        setIsLoading(true);
        try {
            await fetchConfigStatus();
            window.location.hash = 'library';
        } finally {
            setIsLoading(false);
        }
    }, [fetchConfigStatus]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1">You're all set!</h2>
                <p className="text-sm text-slate-400">Query Tester is ready to use.</p>
            </div>

            <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                    <span>&#10003;</span>
                    <span>HEC configured</span>
                </div>
                <div className={'flex items-center gap-2 ' + (emailConfigured ? 'text-green-400' : 'text-slate-500')}>
                    <span>{emailConfigured ? '\u2713' : '\u2013'}</span>
                    <span>Email {emailConfigured ? 'configured' : 'skipped (configure later in Setup)'}</span>
                </div>
            </div>

            <div className="border border-slate-700 rounded-lg bg-navy-950 p-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-3">What's next?</h3>
                <ul className="flex flex-col gap-2 text-xs text-slate-400">
                    <li>Create your first test from the Library page</li>
                    <li>Schedule tests to run automatically on an interval</li>
                    <li>Visit the Setup page anytime to adjust configuration</li>
                </ul>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleGetStarted}
                    disabled={isLoading}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-btnprimary hover:bg-btnprimary-hover text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isLoading ? 'Loading...' : 'Get Started'}
                </button>
            </div>
        </div>
    );
}
