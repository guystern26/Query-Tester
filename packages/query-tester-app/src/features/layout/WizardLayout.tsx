/**
 * WizardLayout — orchestrates stepper, query sidebar, and active step content.
 * Navigation lives in ResultsBar (bottom bar).
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectIsRunning, inputHasData } from 'core/store/selectors';
import { AppSelector } from '../../components/AppSelector';
import { TestTypeSelector } from '../scenarios/TestTypeSelector';
import { WizardStepper } from './WizardStepper';
import type { WizardStep } from './WizardStepper';
import { QuerySidebar } from './QuerySidebar';
import { QuerySection } from '../query/QuerySection';
import { formatSpl } from '../query/splFormatter';
import { ScenarioPanel } from '../scenarios/ScenarioPanel';
import { ValidationSection } from '../validation/ValidationSection';

interface WizardLayoutProps {
    localName: string;
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    app: string;
    onAppChange: (value: string) => void;
    isIde?: boolean;
}

export function WizardLayout({ localName, onNameChange, app, onAppChange, isIde }: WizardLayoutProps): React.ReactElement {
    var test = useTestStore(selectActiveTest);
    var isRunning = useTestStore(selectIsRunning);
    var activeStep = useTestStore(function (s) { return s.activeStep; });
    var setActiveStep = useTestStore(function (s) { return s.setActiveStep; });
    var lastExtractedSpl = useTestStore(function (s) { return s.lastExtractedSpl; });
    var setLastExtractedSpl = useTestStore(function (s) { return s.setLastExtractedSpl; });
    var extractDS = useTestStore(function (s) { return s.fetchExtractDataSources; });
    var updateSpl = useTestStore(function (s) { return s.updateSpl; });
    var runTest = useTestStore(function (s) { return s.runTest; });
    var setResultsBarExpanded = useTestStore(function (s) { return s.setResultsBarExpanded; });
    var sidebarCollapsed = useTestStore(function (s) { return s.querySidebarCollapsed; });
    var sidebarWidth = useTestStore(function (s) { return s.querySidebarWidth; });
    var toggleSidebar = useTestStore(function (s) { return s.toggleQuerySidebar; });
    var setSidebarWidth = useTestStore(function (s) { return s.setQuerySidebarWidth; });
    var highestReached = useTestStore(function (s) { return s.highestStepReached; });
    var addInputFromSource = useTestStore(function (s) { return s.addInputFromSource; });
    var activeScenarioId = useTestStore(function (s) { return s.activeScenarioId; });

    var testType = (test && test.testType) || 'standard';
    var isQueryOnly = testType === 'query_only';
    var spl = (test && test.query && test.query.spl) || '';
    var hasQuery = spl.trim() !== '';
    var dataDone = inputHasData((test && test.scenarios) || []);
    var hasValidation = test
        ? ((test.validation && test.validation.fieldGroups && test.validation.fieldGroups.length > 0)
            || (test.validation && test.validation.resultCount && test.validation.resultCount.enabled))
        : false;

    var stepDefs: WizardStep[] = useMemo(function () {
        if (isQueryOnly) {
            return [
                { id: 'query', label: 'Query', isComplete: hasQuery },
                { id: 'validation', label: 'Validation', isComplete: hasValidation },
            ];
        }
        return [
            { id: 'query', label: 'Query', isComplete: hasQuery },
            { id: 'data', label: 'Data', isComplete: dataDone },
            { id: 'validation', label: 'Validation', isComplete: hasValidation },
        ];
    }, [isQueryOnly, hasQuery, dataDone, hasValidation]);

    var clampedStep = activeStep;
    if (clampedStep >= stepDefs.length) clampedStep = stepDefs.length - 1;
    if (clampedStep < 0) clampedStep = 0;

    var currentStepId = stepDefs[clampedStep] ? stepDefs[clampedStep].id : 'query';

    var canGoNext = clampedStep === 0
        ? hasQuery
        : (currentStepId === 'data')
            ? dataDone
            : false;
    var isFirst = clampedStep === 0;
    var isLast = clampedStep === stepDefs.length - 1;

    var handleNext = useCallback(function () {
        if (clampedStep === 0 && test) {
            var currentSpl = (test.query && test.query.spl) || '';
            var formatted = formatSpl(currentSpl);
            if (formatted !== currentSpl) updateSpl(test.id, formatted);
            if (!isQueryOnly && formatted.trim() && formatted !== lastExtractedSpl) {
                var s0 = test.scenarios[0];
                if (s0) {
                    extractDS(test.id, s0.id, formatted).catch(function () {});
                }
                setLastExtractedSpl(formatted);
            }
        }
        setActiveStep(clampedStep + 1);
    }, [clampedStep, isQueryOnly, test, lastExtractedSpl, extractDS, setLastExtractedSpl, setActiveStep, updateSpl]);

    var handleBack = useCallback(function () {
        setActiveStep(Math.max(0, clampedStep - 1));
    }, [clampedStep, setActiveStep]);

    var handleRun = useCallback(function () {
        runTest();
        setResultsBarExpanded(true);
    }, [runTest, setResultsBarExpanded]);

    var handleStepClick = useCallback(function (index: number) {
        if (index <= highestReached) setActiveStep(index);
    }, [highestReached, setActiveStep]);

    var handleSourceClick = useCallback(function (rowIdentifier: string, fields: string[]) {
        if (!test) return;
        var scenario = activeScenarioId
            ? test.scenarios.find(function (s) { return s.id === activeScenarioId; })
            : test.scenarios[0];
        if (scenario) addInputFromSource(test.id, scenario.id, rowIdentifier, fields);
    }, [test, addInputFromSource, activeScenarioId]);

    var showSidebar = currentStepId === 'data' || currentStepId === 'validation';

    // Slide + fade transition on step change
    var _s = useState(true);
    var visible = _s[0];
    var setVisible = _s[1];
    var _prev = useRef(clampedStep);
    var _dir = useRef(1);

    useEffect(function () {
        _dir.current = clampedStep >= _prev.current ? 1 : -1;
        _prev.current = clampedStep;
        setVisible(false);
        var t = setTimeout(function () { setVisible(true); }, 80);
        return function () { clearTimeout(t); };
    }, [clampedStep]);

    // Keyboard arrow navigation (skip when inside inputs/textareas/editors)
    useEffect(function () {
        function onKey(e: KeyboardEvent) {
            var tag = e.target instanceof HTMLElement ? e.target.tagName : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            var el = e.target instanceof HTMLElement ? e.target : null;
            if (el && el.closest('.ace_editor')) return;
            if (e.key === 'ArrowRight' && canGoNext && !isLast) {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft' && !isFirst) {
                e.preventDefault();
                handleBack();
            }
        }
        document.addEventListener('keydown', onKey);
        return function () { document.removeEventListener('keydown', onKey); };
    }, [canGoNext, isFirst, isLast, handleNext, handleBack]);

    return (
        <div className="flex flex-col flex-1 min-h-0 px-5 pb-1 pt-2 animate-fadeIn">
            {/* Top bar: setup fields | stepper */}
            <div data-tutorial="setup-bar" className="flex items-center gap-3 shrink-0 px-3 py-1.5 bg-navy-800 rounded-xl border border-slate-700/20 shadow-lg shadow-black/20 mb-2">
                <div className="flex items-center gap-2 shrink-0">
                    <input type="text" value={localName} onChange={onNameChange} maxLength={120} placeholder="Test name..."
                        className="w-[130px] px-2 py-1 text-[12px] bg-navy-950 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200" />
                    <AppSelector value={app} onChange={onAppChange} compact />
                    {!isIde ? (
                        <React.Fragment>
                            <div className="w-px h-4 bg-slate-700" />
                            <TestTypeSelector compact />
                        </React.Fragment>
                    ) : null}
                </div>

                <div className="w-px h-5 bg-slate-700 shrink-0" />

                <div data-tutorial="wizard-stepper" className="flex-1 min-w-0 flex items-center gap-2">
                    <WizardStepper steps={stepDefs} activeStep={clampedStep} onStepClick={handleStepClick} />
                    <div className="flex items-center gap-0.5 shrink-0 ml-4">
                        <button type="button" onClick={handleBack} disabled={isFirst}
                            className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded text-slate-600 hover:text-slate-400 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-default">
                            &laquo; Prev
                        </button>
                        {isLast ? (
                            <button type="button" onClick={handleRun} disabled={isRunning}
                                className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded text-green-600 hover:text-green-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default">
                                Run &raquo;
                            </button>
                        ) : (
                            <button type="button" onClick={handleNext} disabled={!canGoNext}
                                className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded text-slate-600 hover:text-slate-400 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-default">
                                Next &raquo;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content area with floating nav squares */}
            <div className="flex flex-1 min-h-0 items-stretch relative mx-10">
                {/* Sidebar */}
                {showSidebar ? (
                    <QuerySidebar
                        collapsed={sidebarCollapsed}
                        width={sidebarWidth}
                        onToggle={toggleSidebar}
                        onResize={setSidebarWidth}
                        interactive={currentStepId === 'data'}
                        onSourceClick={handleSourceClick}
                    />
                ) : null}

                {/* Content card */}
                <div
                    className={'flex-1 min-w-0 bg-navy-800 border border-slate-700/20 px-5 py-3 shadow-lg shadow-black/20 overflow-y-auto flex flex-col gap-2 '
                        + (showSidebar ? 'rounded-r-xl' : 'rounded-xl')}
                    style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateX(0)' : 'translateX(' + (_dir.current * 20) + 'px)',
                        transition: 'opacity 320ms ease-out, transform 320ms ease-out',
                    }}
                >
                    {currentStepId === 'query' ? <QuerySection /> : null}
                    {currentStepId === 'data' ? <ScenarioPanel /> : null}
                    {currentStepId === 'validation' ? <ValidationSection /> : null}
                </div>

                {/* Floating back square */}
                {!isFirst && (
                    <button type="button" onClick={handleBack}
                        title={stepDefs[clampedStep - 1] ? stepDefs[clampedStep - 1].label : 'Back'}
                        className="wizard-float wizard-float-left">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Floating next/run square */}
                {isLast ? (
                    <button type="button" onClick={handleRun} disabled={isRunning}
                        title="Run Test"
                        className="wizard-float wizard-float-right wizard-float-run">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                        </svg>
                    </button>
                ) : canGoNext ? (
                    <button type="button" onClick={handleNext}
                        title={stepDefs[clampedStep + 1] ? 'Next: ' + stepDefs[clampedStep + 1].label : 'Next'}
                        className="wizard-float wizard-float-right">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ) : null}
            </div>
        </div>
    );
}
