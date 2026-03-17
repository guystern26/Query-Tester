import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { SetupField } from './SetupField';

export function TempIndexSection() {
    const appConfig = useTestStore((s) => s.appConfig);
    const tempIndex = appConfig?.tempIndex || 'temp_query_tester';
    const tempSourcetype = appConfig?.tempSourcetype || 'query_tester_input';

    return (
        <div className="rounded-xl border border-slate-700/60 bg-navy-900/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/40 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Temp Index</span>
                <span className="text-[10px] text-slate-500">Read-only &mdash; configured in indexes.conf</span>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4">
                <SetupField
                    label="Index" value={tempIndex} onChange={() => {}}
                    placeholder="temp_query_tester" disabled
                />
                <SetupField
                    label="Sourcetype" value={tempSourcetype} onChange={() => {}}
                    placeholder="query_tester_input" disabled
                />
            </div>
        </div>
    );
}
