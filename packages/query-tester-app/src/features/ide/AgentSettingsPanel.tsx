/**
 * AgentSettingsPanel — 4-tab agent settings (Manager/Explainer/Writer/Validator).
 * Each tab has a system prompt textarea and a list of additional skills.
 * Replaces the flat SkillsManager.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ChatSkill, AgentRole } from '../../core/store/slices/chatSlice';
import { AgentSkillsList, AddSkillButton } from './AgentSkillsList';

const ROLES: AgentRole[] = ['manager', 'explainer', 'writer', 'validator'];
const ROLE_LABELS: Record<AgentRole, string> = {
    manager: 'Manager', explainer: 'Explainer', writer: 'Writer', validator: 'Validator',
};

const TAB_BASE = 'px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border-b-2';
const TAB_ACTIVE = TAB_BASE + ' text-slate-200 border-blue-400';
const TAB_INACTIVE = TAB_BASE + ' text-slate-500 hover:text-slate-300 border-transparent';

export function AgentSettingsPanel(): React.ReactElement {
    const skills = useTestStore((s) => s.chatSkills);
    const loadSkills = useTestStore((s) => s.loadChatSkills);
    const addSkill = useTestStore((s) => s.addChatSkill);
    const saveSkill = useTestStore((s) => s.saveChatSkill);
    const removeSkill = useTestStore((s) => s.removeChatSkill);

    const [activeRole, setActiveRole] = useState<AgentRole>('manager');

    useEffect(() => { loadSkills(); }, [loadSkills]);

    const roleSkills = skills.filter((s) => s.role === activeRole);
    const systemPromptSkill = roleSkills.find((s) => s.isSystemPrompt);
    const additionalSkills = roleSkills.filter((s) => !s.isSystemPrompt);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[12px] text-slate-400">
                Configure the multi-agent pipeline. Each agent has a system prompt and optional skills.
            </p>
            <div className="flex gap-0.5 border-b border-slate-700/60">
                {ROLES.map((role) => {
                    const count = skills.filter((s) => s.role === role && s.enabled).length;
                    return (
                        <button key={role} type="button" onClick={() => setActiveRole(role)}
                            className={activeRole === role ? TAB_ACTIVE : TAB_INACTIVE}>
                            {ROLE_LABELS[role]}
                            {count > 0 && (
                                <span className="ml-1 px-1 py-0.5 text-[9px] rounded-full bg-blue-500/20 text-blue-400">
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <SystemPromptEditor
                skill={systemPromptSkill} role={activeRole}
                onSave={saveSkill} onCreate={addSkill}
            />
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">
                    Additional Skills ({additionalSkills.length})
                </span>
                <AgentSkillsList
                    skills={additionalSkills}
                    onToggle={(s) => saveSkill({ ...s, enabled: !s.enabled })}
                    onSave={saveSkill}
                    onDelete={(id) => removeSkill(id)}
                />
                <AddSkillButton role={activeRole} onCreate={addSkill} />
            </div>
        </div>
    );
}

/* ── System Prompt Editor ── */

interface SystemPromptEditorProps {
    skill: ChatSkill | undefined;
    role: AgentRole;
    onSave: (skill: ChatSkill) => void;
    onCreate: (name: string, prompt: string, role: AgentRole, isSystemPrompt: boolean) => Promise<void>;
}

function SystemPromptEditor({ skill, role, onSave, onCreate }: SystemPromptEditorProps): React.ReactElement {
    const [draft, setDraft] = useState('');
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setDraft(skill?.prompt || '');
        setDirty(false);
    }, [skill?.id, skill?.prompt, role]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDraft(e.target.value);
        setDirty(true);
    }, []);

    const handleSave = useCallback(() => {
        if (skill) {
            onSave({ ...skill, prompt: draft });
        } else {
            void onCreate(ROLE_LABELS[role] + ' System Prompt', draft, role, true);
        }
        setDirty(false);
    }, [skill, draft, role, onSave, onCreate]);

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">System Prompt</span>
            <textarea
                value={draft} onChange={handleChange} rows={8} spellCheck={false}
                placeholder={'Enter the ' + ROLE_LABELS[role] + ' agent system prompt...'}
                className="w-full px-2.5 py-2 text-[12px] leading-relaxed bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-y font-mono"
            />
            {dirty && (
                <button type="button" onClick={handleSave}
                    className="self-end px-3 py-1 text-[11px] font-medium rounded bg-blue-500 text-white hover:bg-blue-400 transition cursor-pointer">
                    Save
                </button>
            )}
        </div>
    );
}
