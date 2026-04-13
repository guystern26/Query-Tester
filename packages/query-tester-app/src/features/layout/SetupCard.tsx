import React from 'react';
import { AppSelector } from '../../components/AppSelector';
import { TestTypeSelector } from '../scenarios/TestTypeSelector';

export interface SetupCardProps {
    localName: string;
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    app: string;
    onAppChange: (value: string) => void;
    isIde?: boolean;
}

export function SetupCard({ localName, onNameChange, app, onAppChange, isIde }: SetupCardProps) {
    if (isIde) {
        return (
            <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
                <div className="w-full max-w-md bg-navy-900 rounded-2xl border border-slate-800 shadow-lg p-8 flex flex-col gap-5">
                    <div className="text-center">
                        <h2 className="text-base font-semibold text-slate-200">Select a Splunk App</h2>
                        <p className="text-[13px] text-slate-400 mt-1">Choose the app context for your query</p>
                    </div>
                    <AppSelector value={app} onChange={onAppChange} autoFocus />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
            <div className="w-full max-w-xl bg-navy-900 rounded-2xl border border-slate-800 shadow-lg p-8 flex flex-col gap-6">
                <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] shrink-0 border-slate-600 bg-navy-700 text-blue-300">
                        1
                    </span>
                    <span className="text-sm font-semibold text-slate-200">Setup</span>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider">Test Name</span>
                    <input
                        type="text"
                        value={localName}
                        onChange={onNameChange}
                        maxLength={120}
                        placeholder="Put your test name here..."
                        className="w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider">Splunk App</span>
                    <AppSelector value={app} onChange={onAppChange} autoFocus />
                </div>
                <TestTypeSelector />
            </div>
        </div>
    );
}
