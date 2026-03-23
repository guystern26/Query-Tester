import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectActiveTestId, inputHasData } from 'core/store/selectors';
import { useLoadTest } from './hooks/useLoadTest';
import { TopBar } from './components/test-navigation/TopBar';
import { AppSelector } from './components/AppSelector';
import { TestTypeSelector } from './features/scenarios/TestTypeSelector';
import { QuerySection } from './features/query/QuerySection';
import { ScenarioPanel } from './features/scenarios/ScenarioPanel';
import { ValidationSection } from './features/validation/ValidationSection';
import { ResultsBar } from './features/results/ResultsBar';
import { usePipelineState } from './features/layout/usePipelineState';
import { StepPipeline } from './features/layout/StepPipeline';
import { PipelineConnector } from './features/layout/PipelineConnector';
import { SetupCard } from './features/layout/SetupCard';

/* ── page component ─────────────────────────────────────────── */

export interface StartPageProps {
    onNavigateLibrary?: () => void;
    loadTestId?: string;
}

export function StartPage({ onNavigateLibrary, loadTestId }: StartPageProps = {}) {
    const state = useTestStore();
    const activeTest = selectActiveTest(state);
    const activeTestId = selectActiveTestId(state);
    const { isLoadingTest, loadError } = useLoadTest(loadTestId);

    const [localName, setLocalName] = useState(activeTest?.name ?? '');
    useEffect(() => { setLocalName(activeTest?.name ?? ''); }, [activeTestId, activeTest?.name]);

    const debouncedUpdateName = useMemo(
        () => debounce((id: string, name: string) => { state.updateTestName(id, name); }, 300),
        [state.updateTestName],
    );
    useEffect(() => () => { debouncedUpdateName.cancel(); }, [debouncedUpdateName]);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocalName(v);
        if (activeTestId) debouncedUpdateName(activeTestId, v);
    }, [activeTestId, debouncedUpdateName]);

    const rowRef = useRef<HTMLDivElement>(null);
    const queryRef = useRef<HTMLDivElement>(null);
    const dataRef = useRef<HTMLDivElement>(null);
    const validationRef = useRef<HTMLDivElement>(null);
    const barExpanded = state.resultsBarExpanded;

    const app = activeTest?.app ?? '';
    const testType = activeTest?.testType ?? 'standard';
    const hasApp = app.trim() !== '';
    const hasQuery = (activeTest?.query?.spl ?? '').trim() !== '';
    const isStandard = testType === 'standard';
    const showData = hasApp && hasQuery && isStandard;
    const dataDone = inputHasData(activeTest?.scenarios ?? []);
    const showValidation = hasApp && hasQuery && (!isStandard || dataDone);

    const pipeline = usePipelineState();

    const handleAppChange = (appValue: string): void => {
        if (activeTest) state.updateApp(activeTest.id, appValue);
    };

    const handleStepClick = useCallback((stepId: string) => {
        const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
            query: queryRef,
            data: dataRef,
            validation: validationRef,
        };
        const ref = refMap[stepId];
        if (ref?.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
    }, []);

    const panelCount = (hasApp ? 1 : 0) + (showData ? 1 : 0) + (showValidation ? 1 : 0);
    const prevCount = useRef(panelCount);

    const scrollToEnd = useCallback(() => {
        const el = rowRef.current;
        if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (panelCount > prevCount.current) scrollToEnd();
        prevCount.current = panelCount;
    }, [panelCount, scrollToEnd]);

    return (
        <div
            className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden"
            style={{ paddingBottom: barExpanded ? '45vh' : '48px' }}
        >
            <TopBar onNavigateLibrary={onNavigateLibrary} onNavigateSetup={() => { window.location.hash = 'setup'; }} />

            {hasApp ? (
                <>
                    <div className="shrink-0 px-5 pt-4 animate-fadeIn">
                        <div className="flex items-center gap-5 px-5 py-2 bg-navy-900 rounded-xl border border-slate-800 shadow-md">
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] shrink-0 border-green-500 bg-green-900/30 text-green-400">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <span className="text-sm font-semibold text-slate-200">Setup</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider">Name</span>
                                <input
                                    type="text"
                                    value={localName}
                                    onChange={handleNameChange}
                                    maxLength={120}
                                    placeholder="Test name..."
                                    className="min-w-[140px] max-w-[220px] px-2.5 py-1 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-500/30 transition-all duration-200"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider">App</span>
                                <AppSelector value={app} onChange={handleAppChange} compact />
                            </div>
                            <TestTypeSelector compact />
                        </div>
                    </div>

                    <StepPipeline
                        steps={pipeline.steps}
                        activeIndex={pipeline.activeIndex}
                        allComplete={pipeline.allComplete}
                        isRunning={pipeline.isRunning}
                        onStepClick={handleStepClick}
                    />
                </>
            ) : isLoadingTest ? (
                <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
                    <div className="flex flex-col items-center gap-4">
                        <svg className="w-8 h-8 text-accent-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                        </svg>
                        <span className="text-sm text-slate-400">Loading test...</span>
                    </div>
                </div>
            ) : loadError ? (
                <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
                    <div className="flex flex-col items-center gap-4 max-w-md text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-sm text-red-400">{loadError}</p>
                        {onNavigateLibrary && (
                            <button
                                type="button"
                                onClick={onNavigateLibrary}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-btnprimary text-white hover:bg-btnprimary-hover cursor-pointer transition-colors"
                            >
                                Go to Library
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <SetupCard localName={localName} onNameChange={handleNameChange} app={app} onAppChange={handleAppChange} />
            )}

            {hasApp && (
                <div ref={rowRef} className="flex gap-0 p-5 overflow-x-auto flex-1 items-stretch animate-fadeIn min-h-0">
                    <div
                        ref={queryRef}
                        className="min-w-[300px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-0"
                        style={{ flex: '32 1 0%' }}
                    >
                        <span className="text-sm font-semibold text-slate-200">Query</span>
                        <QuerySection />
                    </div>

                    {showData && (
                        <>
                            <PipelineConnector leftComplete={hasQuery} />
                            <div
                                ref={dataRef}
                                className="min-w-[360px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-1"
                                style={{ flex: '34 1 0%' }}
                            >
                                <span className="text-sm font-semibold text-slate-200">Data</span>
                                <ScenarioPanel />
                            </div>
                        </>
                    )}

                    {showValidation && (
                        <>
                            <PipelineConnector leftComplete={showData ? dataDone : hasQuery} />
                            <div
                                ref={validationRef}
                                className="min-w-[280px] bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 animate-panelReveal panel-delay-2"
                                style={{ flex: '31 1 0%' }}
                            >
                                <span className="text-sm font-semibold text-slate-200">Validation</span>
                                <ValidationSection />
                            </div>
                        </>
                    )}
                </div>
            )}

            <ResultsBar />
        </div>
    );
}
