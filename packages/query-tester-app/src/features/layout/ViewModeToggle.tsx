/**
 * ViewModeToggle — pill toggle for panel view mode: All at Once / One at a Time.
 */
import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { PanelViewMode } from 'core/store/slices/panelSlice';

const BASE = 'px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-colors duration-200';
const ACTIVE = 'bg-navy-700 text-white border-2 border-slate-600';
const INACTIVE = 'text-slate-500 border-2 border-transparent hover:text-slate-300';

const GridIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
);

const SingleIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
);

export function ViewModeToggle(): React.ReactElement {
    const mode = useTestStore((s) => s.panelViewMode);
    const setMode = useTestStore((s) => s.setPanelViewMode);

    const handleClick = (m: PanelViewMode) => { if (m !== mode) setMode(m); };

    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">View</span>
            <div className="flex rounded-lg p-0.5 gap-0.5">
                <button type="button" onClick={() => handleClick('all')} title="All panels visible"
                    className={`${BASE} ${mode === 'all' ? ACTIVE : INACTIVE}`}>
                    All
                </button>
                <button type="button" onClick={() => handleClick('single')} title="One at a time (arrow keys to switch)"
                    className={`${BASE} ${mode === 'single' ? ACTIVE : INACTIVE}`}>
                    Focus
                </button>
            </div>
        </div>
    );
}
