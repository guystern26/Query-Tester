/**
 * ContextInput — single text area for user context that feeds the LLM analysis.
 * NOT a chat. Just a static description of what the query should do.
 */
import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';

const PLACEHOLDER = 'Describe what this query should do (optional \u2014 helps AI give better analysis)';
const COLLAPSE_KEY = 'qt_ide_context_collapsed';

export function ContextInput(): React.ReactElement {
    const ideUserContext = useTestStore((s) => s.ideUserContext);
    const setIdeUserContext = useTestStore((s) => s.setIdeUserContext);
    const [collapsed, setCollapsed] = useState(() => {
        // Clear stale localStorage value — context should default open
        try { localStorage.removeItem(COLLAPSE_KEY); } catch { /* ignore */ }
        return false;
    });

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setIdeUserContext(e.target.value);
        },
        [setIdeUserContext],
    );

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }, []);

    return (
        <div className="flex flex-col gap-1">
            <button
                type="button"
                onClick={toggleCollapsed}
                className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-300 transition cursor-pointer self-start"
            >
                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                Query context {ideUserContext ? '(set)' : '(optional)'}
            </button>

            {!collapsed && (
                <textarea
                    value={ideUserContext}
                    onChange={handleChange}
                    placeholder={PLACEHOLDER}
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 resize-y transition-all duration-200"
                />
            )}
        </div>
    );
}
