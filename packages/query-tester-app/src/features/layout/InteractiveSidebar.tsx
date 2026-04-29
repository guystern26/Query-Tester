/**
 * InteractiveSidebar — renders SPL with highlighted data source spans
 * and hover tooltips. Used on the Sources step.
 */
import React, { useCallback, useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useSourceSpans } from '../../hooks/useSourceSpans';
import type { SourceSpan } from '../../hooks/useSourceSpans';
import { SourceTooltip } from './SourceTooltip';
import { SOURCE_COLORS, renderInteractiveSpl } from './interactiveSidebarHelpers';

export { SOURCE_COLORS };

interface InteractiveSidebarProps {
    spl: string;
    onSourceClick: (rowIdentifier: string, fields: string[]) => void;
}

/** Returns lowercase row identifiers from the currently selected scenario only */
function useUsedIdentifiers(): string[] {
    const test = useTestStore(selectActiveTest);
    const activeScenarioId = useTestStore(function (s) { return s.activeScenarioId; });
    if (!test) return [];
    const scenario = activeScenarioId
        ? test.scenarios.find(function (s) { return s.id === activeScenarioId; })
        : test.scenarios[0];
    if (!scenario) return [];
    const used: string[] = [];
    for (let ii = 0; ii < scenario.inputs.length; ii++) {
        const ri = scenario.inputs[ii].rowIdentifier.trim();
        if (ri) used.push(ri.toLowerCase());
    }
    return used;
}

interface TooltipState {
    visible: boolean; x: number; y: number;
    isUsed: boolean; rowIdentifier: string; fields: string[]; isFallback: boolean;
}

const TOOLTIP_INITIAL: TooltipState = {
    visible: false, x: 0, y: 0, isUsed: false, rowIdentifier: '', fields: [], isFallback: false,
};

export function InteractiveSidebar({ spl, onSourceClick }: InteractiveSidebarProps): React.ReactElement {
    const test = useTestStore(selectActiveTest);
    const sources = (test && test.fieldExtraction && test.fieldExtraction.sources) || [];
    const { spans } = useSourceSpans(spl, sources);
    const usedSet = useUsedIdentifiers();
    const [tooltip, setTooltip] = useState<TooltipState>(TOOLTIP_INITIAL);

    const handleClick = useCallback((ri: string, fields: string[]) => {
        setTooltip(TOOLTIP_INITIAL);
        onSourceClick(ri, fields);
    }, [onSourceClick]);

    const handleHover = useCallback((e: React.MouseEvent, sp: SourceSpan, isUsed: boolean) => {
        setTooltip({
            visible: true, x: e.clientX, y: e.clientY,
            isUsed: isUsed, rowIdentifier: sp.rowIdentifier,
            fields: sp.fields, isFallback: sp.isFallback || false,
        });
    }, []);

    const handleLeave = useCallback(() => {
        setTooltip((prev) => ({ ...prev, visible: false }));
    }, []);

    const hasSources = spans.length > 0;

    return (
        <div className="flex flex-col gap-2">
            {hasSources && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-300/10 border border-blue-300/20 rounded-md mb-1">
                    <svg className="w-3.5 h-3.5 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-[11px] text-blue-300 font-medium">Click a source to add it as an input</span>
                </div>
            )}
            <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                {renderInteractiveSpl(spl, spans, usedSet, handleClick, handleHover, handleLeave)}
            </pre>
            {!hasSources && sources.length === 0 && (
                <div className="text-[11px] text-slate-500 italic mt-2">
                    No data sources detected. Add an input manually.
                </div>
            )}
            <SourceTooltip
                visible={tooltip.visible}
                x={tooltip.x}
                y={tooltip.y}
                isUsed={tooltip.isUsed}
                rowIdentifier={tooltip.rowIdentifier}
                fields={tooltip.fields}
                isFallback={tooltip.isFallback}
            />
        </div>
    );
}
