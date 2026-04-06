/**
 * IntelligencePanel — tabbed container for Analysis and Chat.
 * Both children stay mounted (hidden class) to preserve state across tab switches.
 */
import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { AnalysisNote } from '../../api/ideApi';
import { AnalysisPanel } from './AnalysisPanel';
import { IdeChat } from './IdeChat';
import { ChatSettingsModal } from './ChatSettingsModal';

type Tab = 'analysis' | 'chat';

const TAB_BASE = 'px-3 py-1 text-[12px] font-medium transition cursor-pointer';
const TAB_ACTIVE = TAB_BASE + ' text-slate-200 border-b-2 border-blue-400';
const TAB_INACTIVE = TAB_BASE + ' text-slate-500 hover:text-slate-300 border-b-2 border-transparent';

export function IntelligencePanel(): React.ReactElement {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [showSettings, setShowSettings] = useState(false);
    const analysisNotes = useTestStore((s) => s.analysisNotes);
    const analysisLoading = useTestStore((s) => s.analysisLoading);
    const chatExpanded = useTestStore((s) => s.chatExpanded);
    const toggleChatExpanded = useTestStore((s) => s.toggleChatExpanded);
    const test = useTestStore(selectActiveTest);
    const updateSpl = useTestStore((s) => s.updateSpl);

    const handleApply = useCallback((note: AnalysisNote) => {
        if (!test || note.line === null || note.line === undefined || !note.suggestion) return;
        const spl = test.query?.spl ?? '';
        const lines = spl.split('\n');
        const lineIdx = note.line - 1;
        if (lineIdx < 0 || lineIdx >= lines.length) return;
        lines[lineIdx] = note.suggestion;
        updateSpl(test.id, lines.join('\n'));
    }, [test, updateSpl]);

    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="flex items-center border-b border-slate-700/60 shrink-0 mb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('analysis')}
                    className={activeTab === 'analysis' ? TAB_ACTIVE : TAB_INACTIVE}
                >
                    Analysis
                    {analysisLoading && (
                        <span className="ml-1.5 inline-block w-2.5 h-2.5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin align-middle" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={activeTab === 'chat' ? TAB_ACTIVE : TAB_INACTIVE}
                >
                    Chat
                </button>
                <div className="flex-1" />
                {/* Chat settings gear */}
                <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    title="Chat prompt settings"
                    className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
                {/* Expand/collapse toggle */}
                <button
                    type="button"
                    onClick={toggleChatExpanded}
                    title={chatExpanded ? 'Collapse panel' : 'Expand panel'}
                    className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {chatExpanded ? (
                            <React.Fragment>
                                <polyline points="4 14 10 14 10 20" />
                                <polyline points="20 10 14 10 14 4" />
                                <line x1="14" y1="10" x2="21" y2="3" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <polyline points="15 3 21 3 21 9" />
                                <polyline points="9 21 3 21 3 15" />
                                <line x1="21" y1="3" x2="14" y2="10" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </React.Fragment>
                        )}
                    </svg>
                </button>
            </div>

            {/* Panels — both mounted, toggle visibility */}
            <div className={`flex-1 overflow-y-auto min-h-0 ${activeTab === 'analysis' ? '' : 'hidden'}`}>
                <AnalysisPanel
                    notes={analysisNotes}
                    isLoading={analysisLoading}
                    onApplySuggestion={handleApply}
                />
            </div>
            <div className={`flex-1 min-h-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
                <IdeChat />
            </div>
            {showSettings && <ChatSettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
}
