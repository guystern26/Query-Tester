/**
 * WizardNavigation — minimal chevron-style nav (« ») integrated into stepper row.
 */
import React from 'react';

interface WizardNavigationProps {
    activeStep: number;
    totalSteps: number;
    stepLabels: string[];
    canGoNext: boolean;
    isRunning: boolean;
    onNext: () => void;
    onBack: () => void;
    onRun: () => void;
}

export function WizardNavigation({
    activeStep, totalSteps, stepLabels, canGoNext, isRunning, onNext, onBack, onRun,
}: WizardNavigationProps): React.ReactElement {
    var isFirst = activeStep === 0;
    var isLast = activeStep === totalSteps - 1;

    return (
        <div className="flex items-center gap-1 shrink-0">
            {/* Back chevron */}
            <button
                type="button"
                onClick={onBack}
                disabled={isFirst}
                title={!isFirst && stepLabels[activeStep - 1] ? stepLabels[activeStep - 1] : 'Back'}
                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-navy-700/50 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-400"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Forward / Run */}
            {isLast ? (
                <button
                    type="button"
                    onClick={onRun}
                    disabled={isRunning}
                    title="Run Test"
                    className="w-7 h-7 flex items-center justify-center rounded-md text-green-400 hover:text-green-300 hover:bg-green-900/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                    {isRunning ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                        </svg>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canGoNext}
                    title={stepLabels[activeStep + 1] ? 'Next: ' + stepLabels[activeStep + 1] : 'Next'}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-200 hover:bg-navy-700/50 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
}
