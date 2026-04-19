/**
 * BuilderPanels — 3-panel builder with collapse support.
 * "all" mode: panels side by side, each collapsible independently.
 * "single" mode: accordion — 1 open at a time, keyboard arrows to switch.
 */
import React, { useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { PanelId } from 'core/store/slices/panelSlice';
import { QuerySection } from '../query/QuerySection';
import { ScenarioPanel } from '../scenarios/ScenarioPanel';
import { ValidationSection } from '../validation/ValidationSection';

const LABEL = 'text-[13px] font-bold text-slate-400 uppercase tracking-wide';

interface PanelDef {
    id: PanelId; label: string; ref: React.RefObject<HTMLDivElement>;
    weight: number; content: React.ReactNode; show: boolean; complete: boolean;
}

interface Props {
    rowRef: React.RefObject<HTMLDivElement>;
    queryRef: React.RefObject<HTMLDivElement>;
    dataRef: React.RefObject<HTMLDivElement>;
    validationRef: React.RefObject<HTMLDivElement>;
    hasQuery: boolean; showData: boolean; dataDone: boolean; showValidation: boolean;
}

export function BuilderPanels({ rowRef, queryRef, dataRef, validationRef, hasQuery, showData, dataDone, showValidation }: Props): React.ReactElement {
    const viewMode = useTestStore((s) => s.panelViewMode);
    const collapsed = useTestStore((s) => s.collapsedPanels);
    const toggle = useTestStore((s) => s.togglePanelCollapsed);
    const setIdx = useTestStore((s) => s.setActivePanelIndex);

    const panels: PanelDef[] = [
        { id: 'query', label: 'Query', ref: queryRef, weight: 27, content: <QuerySection />, show: true, complete: hasQuery },
        { id: 'data', label: 'Data', ref: dataRef, weight: 40, content: <ScenarioPanel />, show: showData, complete: dataDone },
        { id: 'validation', label: 'Validation', ref: validationRef, weight: 33, content: <ValidationSection />, show: showValidation, complete: false },
    ];
    const visible = panels.filter((p) => p.show);

    const openOne = useCallback((id: PanelId) => {
        const idx = visible.findIndex((p) => p.id === id);
        if (idx >= 0) setIdx(idx);
        visible.forEach((p) => { const want = p.id === id; if (collapsed[p.id] !== !want) toggle(p.id); });
    }, [visible, collapsed, toggle, setIdx]);

    const handleClick = useCallback((id: PanelId) => {
        if (viewMode === 'single') { if (collapsed[id]) openOne(id); }
        else toggle(id);
    }, [viewMode, collapsed, toggle, openOne]);

    useEffect(() => {
        if (viewMode !== 'single') return;
        const handler = (e: KeyboardEvent) => {
            const t = e.target instanceof HTMLElement ? e.target.tagName : '';
            if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
            const cur = visible.findIndex((p) => !collapsed[p.id]);
            let next = cur;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(cur + 1, visible.length - 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(cur - 1, 0);
            else return;
            if (next !== cur) { e.preventDefault(); openOne(visible[next].id); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [viewMode, visible, collapsed, openOne]);

    useEffect(() => {
        if (viewMode === 'single') { const open = visible.filter((p) => !collapsed[p.id]); if (open.length !== 1) openOne(visible[0]?.id || 'query'); }
    }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={rowRef} className="flex gap-2 px-5 pb-5 pt-3 overflow-x-auto flex-1 items-stretch animate-fadeIn min-h-0">
            {visible.map((panel) => {
                const shut = collapsed[panel.id];
                return (
                    <div
                        key={panel.id}
                        ref={panel.ref}
                        onClick={shut ? () => handleClick(panel.id) : undefined}
                        className={`bg-navy-800 rounded-xl border border-slate-700/20 flex flex-col ${
                            shut
                                ? 'p-3 cursor-pointer hover:border-slate-500 hover:bg-navy-700/30 items-center justify-center'
                                : 'p-5 gap-4 overflow-y-auto shadow-lg shadow-black/20'
                        }`}
                        style={{
                            flex: shut ? '1 1 0%' : panel.weight + ' 1 0%',
                            transition: 'flex 400ms ease, border-color 200ms ease, background-color 200ms ease',
                        }}
                    >
                        {shut ? (
                            <span className="text-[13px] font-bold text-slate-500 uppercase tracking-wide">{panel.label}</span>
                        ) : (
                            <>
                                <div className="flex items-center justify-between cursor-pointer select-none shrink-0 group" onClick={() => handleClick(panel.id)}>
                                    <span className={LABEL}>{panel.label}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-slate-300 transition-colors">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                                {panel.content}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
