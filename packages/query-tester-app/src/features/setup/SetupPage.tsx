import React from 'react';
import { useSetupPage } from './useSetupPage';
import { TestConnectionBar } from './TestConnectionBar';
import { SplunkSection } from './SplunkSection';
import { HecSection } from './HecSection';
import { TempIndexSection } from './TempIndexSection';
import { EmailSection } from './EmailSection';
import { LlmSection } from './LlmSection';
import { WebUrlSection } from './WebUrlSection';
import { LoggingSection } from './LoggingSection';
import { CommandPolicySection } from './CommandPolicySection';
import { BugReportButton } from '../../components/test-navigation/BugReportButton';

export interface SetupPageProps {
    onNavigateBack: () => void;
}

export function SetupPage({ onNavigateBack }: SetupPageProps) {
    const { appConfig, isLoadingConfig, configError } = useSetupPage();

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100">
            <header className="sticky top-0 z-50 h-14 bg-navy-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onNavigateBack}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer text-sm"
                    >
                        &larr; Back
                    </button>
                    <div className="w-px h-5 bg-slate-700" />
                    <span className="text-sm font-semibold text-slate-400">Administrator Setup</span>
                </div>
                <BugReportButton />
            </header>

            <div className="px-6 py-6">
                <div className="max-w-3xl mx-auto flex flex-col gap-5">
                    {configError && (
                        <div className="px-3 py-2 rounded-md border-l-4 border-red-500 bg-red-500/10 text-xs text-red-300">
                            {configError}
                        </div>
                    )}

                    {isLoadingConfig && !appConfig && (
                        <div className="text-sm text-slate-400">Loading configuration...</div>
                    )}

                    {appConfig && (
                        <>
                            <TestConnectionBar />
                            <SplunkSection />
                            <HecSection />
                            <TempIndexSection />
                            <EmailSection />
                            <LlmSection />
                            <WebUrlSection />
                            <LoggingSection />
                            <CommandPolicySection />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
