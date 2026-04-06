/**
 * BuilderPanels — The horizontal scrollable panel row for builder mode.
 * Contains Query, Data (conditional), and Validation (conditional) panels.
 */
import React from 'react';
import { QuerySection } from '../query/QuerySection';
import { ScenarioPanel } from '../scenarios/ScenarioPanel';
import { ValidationSection } from '../validation/ValidationSection';
import { PipelineConnector } from './PipelineConnector';

interface BuilderPanelsProps {
    rowRef: React.RefObject<HTMLDivElement>;
    queryRef: React.RefObject<HTMLDivElement>;
    dataRef: React.RefObject<HTMLDivElement>;
    validationRef: React.RefObject<HTMLDivElement>;
    hasQuery: boolean;
    showData: boolean;
    dataDone: boolean;
    showValidation: boolean;
}

export function BuilderPanels({
    rowRef, queryRef, dataRef, validationRef,
    hasQuery, showData, dataDone, showValidation,
}: BuilderPanelsProps): React.ReactElement {
    return (
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
    );
}
