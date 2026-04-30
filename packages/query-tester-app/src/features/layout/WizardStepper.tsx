/**
 * WizardStepper — subtle horizontal step bar. Navy palette, no glow.
 */
import React from 'react';

export interface WizardStep {
    id: string;
    label: string;
    isComplete: boolean;
}

interface WizardStepperProps {
    steps: WizardStep[];
    activeStep: number;
    onStepClick: (index: number) => void;
}

interface StepCircleProps {
    step: WizardStep;
    index: number;
    isActive: boolean;
    onClick: (() => void) | undefined;
}

function StepCircle({ step, index, isActive, onClick }: StepCircleProps): React.ReactElement {
    var canClick = !isActive && onClick != null;

    var circleClass = step.isComplete
        ? 'border-green-500/60 bg-green-900/20 text-green-400/80'
        : isActive
            ? 'border-slate-400 bg-navy-700 text-slate-200'
            : 'border-slate-700 bg-navy-900 text-slate-500';

    return (
        <button
            type="button"
            onClick={canClick ? onClick : undefined}
            className={'flex items-center gap-1.5 shrink-0 focus:outline-none '
                + (canClick ? 'cursor-pointer group' : 'cursor-default')}
        >
            <span className={'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 '
                + circleClass
                + (isActive ? ' scale-110' : '')
                + (canClick ? ' group-hover:border-blue-300/40 group-hover:text-blue-300/80' : '')}>
                {step.isComplete ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    index + 1
                )}
            </span>
            <span
                className={'transition-all duration-300 '
                    + (isActive
                        ? 'text-[14px] font-bold text-white'
                        : step.isComplete
                            ? 'text-[12px] text-slate-400'
                            : 'text-[12px] text-slate-500')
                    + (canClick ? ' group-hover:text-blue-300/80' : '')}
            >
                {step.label}
            </span>
        </button>
    );
}

function StepPipe({ filled }: { filled: boolean }): React.ReactElement {
    return (
        <div className="flex-1 h-6 flex items-center mx-2 min-w-[24px] max-w-[80px]">
            <div className={'w-full h-px transition-colors duration-300 '
                + (filled ? 'bg-green-500/40' : 'bg-slate-700/60')} />
        </div>
    );
}

export function WizardStepper({ steps, activeStep, onStepClick }: WizardStepperProps): React.ReactElement {
    return (
        <div className="flex items-center py-1">
                {steps.map(function (step, i) {
                    return (
                        <React.Fragment key={step.id}>
                            <StepCircle
                                step={step}
                                index={i}
                                isActive={i === activeStep}
                                onClick={function () { onStepClick(i); }}
                            />
                            {i < steps.length - 1 && (
                                <StepPipe filled={step.isComplete} />
                            )}
                        </React.Fragment>
                    );
                })}
        </div>
    );
}
