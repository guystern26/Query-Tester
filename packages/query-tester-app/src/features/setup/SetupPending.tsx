import React from 'react';

export function SetupPending(): React.ReactElement {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100">
            <div className="text-center max-w-md px-6">
                <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.5" className="text-slate-400">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-100 mb-3">Setup Required</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                    An administrator needs to complete the initial setup before you
                    can use Query Tester. Please contact your Splunk admin.
                </p>
            </div>
        </div>
    );
}
