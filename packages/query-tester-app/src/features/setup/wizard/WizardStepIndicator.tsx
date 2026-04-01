import React from 'react';

export interface WizardStep {
    label: string;
}

export interface WizardStepIndicatorProps {
    steps: WizardStep[];
    currentStep: number;
}

export function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((step, i) => {
                const isComplete = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && (
                            <div className={'h-px w-10 ' + (isComplete ? 'bg-blue-400' : 'bg-slate-700')} />
                        )}
                        <div className="flex items-center gap-2">
                            <div className={
                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
                                (isComplete
                                    ? 'bg-blue-400 text-white'
                                    : isCurrent
                                        ? 'bg-blue-400/20 text-blue-400 ring-2 ring-blue-400'
                                        : 'bg-slate-800 text-slate-500')
                            }>
                                {isComplete ? '\u2713' : i + 1}
                            </div>
                            <span className={
                                'text-xs font-semibold whitespace-nowrap ' +
                                (isCurrent ? 'text-slate-200' : isComplete ? 'text-slate-400' : 'text-slate-500')
                            }>
                                {step.label}
                            </span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
