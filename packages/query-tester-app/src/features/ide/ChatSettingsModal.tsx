/**
 * ChatSettingsModal — Tabbed settings for the IDE chat: base prompt + skills.
 */
import React, { useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { DEFAULT_BASE_PROMPT } from '../../api/chatPrompts';
import { SkillsManager } from './SkillsManager';

type SettingsTab = 'prompt' | 'skills';

const TAB_BASE = 'px-3 py-1.5 text-[12px] font-medium transition cursor-pointer border-b-2';
const TAB_ACTIVE = TAB_BASE + ' text-slate-200 border-blue-400';
const TAB_INACTIVE = TAB_BASE + ' text-slate-500 hover:text-slate-300 border-transparent';

interface ChatSettingsModalProps {
    onClose: () => void;
}

export function ChatSettingsModal({ onClose }: ChatSettingsModalProps): React.ReactElement {
    const [tab, setTab] = useState<SettingsTab>('prompt');
    const chatCustomPrompt = useTestStore((s) => s.chatCustomPrompt);
    const setChatCustomPrompt = useTestStore((s) => s.setChatCustomPrompt);
    const chatSkills = useTestStore((s) => s.chatSkills);

    const [draft, setDraft] = useState(chatCustomPrompt || DEFAULT_BASE_PROMPT);

    const handleSavePrompt = useCallback(() => {
        const trimmed = draft.trim();
        setChatCustomPrompt(trimmed === DEFAULT_BASE_PROMPT ? '' : trimmed);
        onClose();
    }, [draft, setChatCustomPrompt, onClose]);

    const handleReset = useCallback(() => { setDraft(DEFAULT_BASE_PROMPT); }, []);

    const enabledCount = chatSkills.filter((s) => s.enabled).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="w-[660px] max-h-[82vh] bg-navy-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}>
                {/* Header with tabs */}
                <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-700/60">
                    <div className="flex gap-1">
                        <button type="button" onClick={() => setTab('prompt')} className={tab === 'prompt' ? TAB_ACTIVE : TAB_INACTIVE}>
                            Base Prompt
                        </button>
                        <button type="button" onClick={() => setTab('skills')} className={tab === 'skills' ? TAB_ACTIVE : TAB_INACTIVE}>
                            Skills
                            {enabledCount > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-500/20 text-blue-400">
                                    {enabledCount}
                                </span>
                            )}
                        </button>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 transition cursor-pointer mb-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                    {tab === 'prompt' ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-[12px] text-slate-400">
                                The base prompt sent to the AI on every chat message. The current query,
                                results, active skills, and action syntax are appended automatically.
                            </p>
                            <textarea
                                value={draft} onChange={(e) => setDraft(e.target.value)}
                                rows={14} spellCheck={false}
                                className="w-full px-3 py-2.5 text-[13px] leading-relaxed bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-y font-mono"
                            />
                            <p className="text-[11px] text-slate-500">
                                Leave empty or reset to use the default. Saved to your browser.
                            </p>
                        </div>
                    ) : (
                        <SkillsManager />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/60">
                    {tab === 'prompt' ? (
                        <button type="button" onClick={handleReset}
                            className="text-[12px] text-slate-500 hover:text-slate-300 transition cursor-pointer">
                            Reset to default
                        </button>
                    ) : (
                        <span className="text-[11px] text-slate-500">
                            {chatSkills.length} skill{chatSkills.length !== 1 ? 's' : ''}, {enabledCount} active
                        </span>
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 text-[12px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer">
                            {tab === 'skills' ? 'Done' : 'Cancel'}
                        </button>
                        {tab === 'prompt' && (
                            <button type="button" onClick={handleSavePrompt}
                                className="px-4 py-1.5 text-[12px] font-medium rounded bg-blue-500 text-white hover:bg-blue-400 transition cursor-pointer">
                                Save
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
