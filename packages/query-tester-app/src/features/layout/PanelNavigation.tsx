/**
 * PanelNavigation — Arrow buttons + step indicator for single-panel view mode.
 */
import React from 'react';

const ARROW_CLS = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

interface PanelNavigationProps {
    labels: string[];
    activeIndex: number;
    onNavigate: (index: number) => void;
}

export function PanelNavigation({ labels, activeIndex, onNavigate }: PanelNavigationProps): React.ReactElement {
    return (
        <div className="flex items-center justify-center gap-3 py-2">
            <button type="button" disabled={activeIndex === 0} onClick={() => onNavigate(activeIndex - 1)} className={ARROW_CLS}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>
            <div className="flex items-center gap-1.5">
                {labels.map((label, i) => (
                    <button key={label} type="button" onClick={() => onNavigate(i)}
                        className={`text-[12px] font-semibold transition-colors duration-200 cursor-pointer ${
                            i === activeIndex ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}>
                        {label}
                        {i < labels.length - 1 && <span className="text-slate-600 ml-1.5">·</span>}
                    </button>
                ))}
            </div>
            <button type="button" disabled={activeIndex === labels.length - 1} onClick={() => onNavigate(activeIndex + 1)} className={ARROW_CLS}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
}
