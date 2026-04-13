import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectActiveTestId, inputHasData } from 'core/store/selectors';
import { useLoadTest } from './hooks/useLoadTest';
import { useIdeTransfer } from './hooks/useIdeTransfer';
import { useIdeKeyboardShortcuts } from './hooks/useIdeKeyboardShortcuts';
import { TopBar } from './components/test-navigation/TopBar';
import { AppSelector } from './components/AppSelector';
import { TestTypeSelector } from './features/scenarios/TestTypeSelector';
import { ViewModeToggle } from './features/layout/ViewModeToggle';
import { QuerySection } from './features/query/QuerySection';
import { ResultsBar } from './features/results/ResultsBar';
import { IdeResultsBar } from './features/results/IdeResultsBar';
import { IntelligencePanel } from './features/ide/IntelligencePanel';
import { DangerousCommandModal } from './features/ide/DangerousCommandModal';
import { ContextInput } from './features/ide/ContextInput';
import { usePipelineState } from './features/layout/usePipelineState';
import { StepPipeline } from './features/layout/StepPipeline';
import { BuilderPanels } from './features/layout/BuilderPanels';
import { SetupCard } from './features/layout/SetupCard';
import { useTutorial } from './features/tutorial/useTutorial';
import { TutorialOverlay } from './features/tutorial/TutorialOverlay';

export interface StartPageProps {
    mode?: 'builder' | 'ide';
    onNavigateLibrary?: () => void;
    loadTestId?: string;
}

export function StartPage({ mode = 'builder', onNavigateLibrary, loadTestId }: StartPageProps = {}) {
    const isIde = mode === 'ide';
    const activeTest = useTestStore(selectActiveTest);
    const activeTestId = useTestStore(selectActiveTestId);
    const chatExpanded = useTestStore((s) => s.chatExpanded);
    const barExpanded = useTestStore((s) => s.resultsBarExpanded);
    const updateTestName = useTestStore((s) => s.updateTestName);
    const updateApp = useTestStore((s) => s.updateApp);
    const updateTestType = useTestStore((s) => s.updateTestType);
    const { isLoadingTest, loadError } = useLoadTest(loadTestId);

    useEffect(() => {
        if (isIde && activeTestId && activeTest?.testType !== 'query_only') {
            updateTestType(activeTestId, 'query_only');
        }
    }, [isIde, activeTestId, activeTest?.testType, updateTestType]);

    useIdeTransfer(mode);

    const [localName, setLocalName] = useState(activeTest?.name ?? '');
    useEffect(() => { setLocalName(activeTest?.name ?? ''); }, [activeTestId, activeTest?.name]);

    const debouncedUpdateName = useMemo(
        () => debounce((id: string, name: string) => { updateTestName(id, name); }, 300),
        [updateTestName],
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

    const app = activeTest?.app ?? '';
    const spl = activeTest?.query?.spl ?? '';
    const testType = activeTest?.testType ?? 'standard';
    const hasApp = app.trim() !== '';
    const hasQuery = spl.trim() !== '';

    const kbShortcuts = useIdeKeyboardShortcuts(isIde);

    const isStandard = testType === 'standard';
    const showData = !isIde && hasApp && hasQuery && isStandard;
    const dataDone = inputHasData(activeTest?.scenarios ?? []);
    const showValidation = !isIde && hasApp && hasQuery && (!isStandard || dataDone);

    const pipeline = usePipelineState();
    const tutorial = useTutorial();
    const setupRequired = useTestStore((s) => s.setupRequired);
    const [showTourPrompt, setShowTourPrompt] = useState(false);

    // Show tour prompt on first-ever visit (per browser)
    useEffect(() => {
        if (isIde || setupRequired) return;
        try {
            if (!localStorage.getItem('qt_tour_seen')) {
                localStorage.setItem('qt_tour_seen', '1');
                setShowTourPrompt(true);
            }
        } catch { /* localStorage unavailable */ }
    }, [setupRequired]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTourAccept = useCallback(() => {
        setShowTourPrompt(false);
        tutorial.start();
    }, [tutorial]);

    const handleTourSkip = useCallback(() => {
        setShowTourPrompt(false);
    }, []);

    const handleAppChange = (appValue: string): void => { if (activeTest) updateApp(activeTest.id, appValue); };

    const handleStepClick = useCallback((stepId: string) => {
        const refMap: Record<string, React.RefObject<HTMLDivElement>> = { query: queryRef, data: dataRef, validation: validationRef };
        const ref = refMap[stepId];
        if (ref?.current) ref.current.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }, []);

    const panelCount = (hasApp ? 1 : 0) + (showData ? 1 : 0) + (showValidation ? 1 : 0);
    const prevCount = useRef(panelCount);
    const scrollToEnd = useCallback(() => { const el = rowRef.current; if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }); }, []);
    useEffect(() => { if (panelCount > prevCount.current) scrollToEnd(); prevCount.current = panelCount; }, [panelCount, scrollToEnd]);

    return (
        <div
            className="h-screen flex flex-col bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100 overflow-hidden"
            style={{ paddingBottom: barExpanded ? '45vh' : '48px' }}
        >
            <TopBar mode={mode} onNavigateLibrary={onNavigateLibrary} onNavigateSetup={() => { window.location.hash = 'setup'; }} onStartTutorial={isIde ? undefined : tutorial.start} />

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
                                <input type="text" value={localName} onChange={handleNameChange} maxLength={120} placeholder="Test name..."
                                    className="min-w-[140px] max-w-[220px] px-2.5 py-1 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 uppercase tracking-wider">App</span>
                                <AppSelector value={app} onChange={handleAppChange} compact />
                            </div>
                            {!isIde && <TestTypeSelector compact />}
                            {!isIde && <ViewModeToggle />}
                        </div>
                    </div>
                    {/* Step pipeline hidden — panel titles serve the same purpose */}
                </>
            ) : isLoadingTest ? (
                <div className="flex-1 flex items-center justify-center px-5 pt-4 animate-fadeIn">
                    <div className="flex flex-col items-center gap-4">
                        <svg className="w-8 h-8 text-blue-300 animate-spin" fill="none" viewBox="0 0 24 24">
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
                            <button type="button" onClick={onNavigateLibrary}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-300 text-slate-900 hover:bg-blue-200 cursor-pointer transition-colors">
                                Go to Library
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <SetupCard localName={localName} onNameChange={handleNameChange} app={app} onAppChange={handleAppChange} isIde={isIde} />
            )}

            {hasApp && isIde ? (
                <div className="flex gap-4 p-5 flex-1 animate-fadeIn min-h-0">
                    <div className="flex-1 bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 min-w-0">
                        <span className="text-sm font-semibold text-slate-200">Query</span>
                        <QuerySection isIde />
                        <ContextInput />
                    </div>
                    <div className={`shrink-0 bg-navy-900 rounded-xl border border-slate-800 p-5 overflow-y-auto transition-all duration-300 ${chatExpanded ? 'w-[60%]' : 'w-[380px]'}`}>
                        <IntelligencePanel />
                    </div>
                </div>
            ) : hasApp ? (
                <BuilderPanels rowRef={rowRef} queryRef={queryRef} dataRef={dataRef} validationRef={validationRef}
                    hasQuery={hasQuery} showData={showData} dataDone={dataDone} showValidation={showValidation} />
            ) : null}

            {isIde ? <IdeResultsBar /> : <ResultsBar />}
            {!isIde && <TutorialOverlay tutorial={tutorial} />}
            {showTourPrompt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                    <div className="bg-navy-900 border border-slate-700 rounded-xl p-6 max-w-sm shadow-2xl shadow-black/40 text-center">
                        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
                                <circle cx="12" cy="12" r="9.5" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-100 mb-1">First time here?</h3>
                        <p className="text-sm text-slate-400 mb-5">Take a quick tour to learn how Query Tester works.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button type="button" onClick={handleTourSkip} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">
                                Skip
                            </button>
                            <button type="button" onClick={handleTourAccept} className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-300 hover:bg-blue-200 text-slate-900 cursor-pointer">
                                Let's go
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {kbShortcuts.dangerousCommands.length > 0 && (
                <DangerousCommandModal commands={kbShortcuts.dangerousCommands} onConfirm={kbShortcuts.confirmDangerous} onCancel={kbShortcuts.cancelDangerous} />
            )}
        </div>
    );
}
