import React, { useState, useCallback, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { WizardStepIndicator } from './wizard/WizardStepIndicator';
import { WizardStepHec } from './wizard/WizardStepHec';
import { WizardStepEmail } from './wizard/WizardStepEmail';
import { WizardStepDone } from './wizard/WizardStepDone';

const STEPS = [
    { label: 'HEC Setup' },
    { label: 'Email' },
    { label: 'Done' },
];

export function SetupWizard(): React.ReactElement {
    const fetchAppConfig = useTestStore((s) => s.fetchAppConfig);
    const [step, setStep] = useState(0);
    const [emailConfigured, setEmailConfigured] = useState(false);

    useEffect(() => {
        void fetchAppConfig();
    }, [fetchAppConfig]);

    const handleHecNext = useCallback(() => setStep(1), []);

    const handleEmailNext = useCallback(() => {
        setEmailConfigured(true);
        setStep(2);
    }, []);

    const handleEmailSkip = useCallback(() => {
        setEmailConfigured(false);
        setStep(2);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-navy-900 to-navy-800 text-slate-100">
            <div className="w-full max-w-2xl px-6 py-12 flex flex-col gap-8">
                <div className="text-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                        Query Tester
                    </span>
                </div>

                <WizardStepIndicator steps={STEPS} currentStep={step} />

                <div className="border border-slate-700 rounded-xl bg-navy-900 p-8 shadow-xl shadow-black/20">
                    {step === 0 && <WizardStepHec onNext={handleHecNext} />}
                    {step === 1 && (
                        <WizardStepEmail onNext={handleEmailNext} onSkip={handleEmailSkip} />
                    )}
                    {step === 2 && <WizardStepDone emailConfigured={emailConfigured} />}
                </div>
            </div>
        </div>
    );
}
