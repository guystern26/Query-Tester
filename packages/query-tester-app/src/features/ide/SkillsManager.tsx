/**
 * SkillsManager — Add, edit, toggle, and delete skills for the IDE chat agent.
 * Each skill is a named instruction block injected into the system prompt.
 * Skills are persisted to the Splunk KVStore backend.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { ChatSkill } from '../../core/store/slices/chatSlice';

export function SkillsManager(): React.ReactElement {
    const skills = useTestStore((s) => s.chatSkills);
    const loadSkills = useTestStore((s) => s.loadChatSkills);
    const addSkill = useTestStore((s) => s.addChatSkill);
    const saveSkill = useTestStore((s) => s.saveChatSkill);
    const removeSkill = useTestStore((s) => s.removeChatSkill);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftPrompt, setDraftPrompt] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => { loadSkills(); }, [loadSkills]);

    const handleAdd = useCallback(async () => {
        setIsAdding(true);
        try { await addSkill('New Skill', ''); } finally { setIsAdding(false); }
    }, [addSkill]);

    const handleToggle = useCallback((skill: ChatSkill) => {
        saveSkill({ ...skill, enabled: !skill.enabled });
    }, [saveSkill]);

    const handleDelete = useCallback((id: string) => {
        if (editingId === id) setEditingId(null);
        removeSkill(id);
    }, [removeSkill, editingId]);

    const handleEdit = useCallback((skill: ChatSkill) => {
        setEditingId(skill.id);
        setDraftName(skill.name);
        setDraftPrompt(skill.prompt);
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editingId) return;
        const skill = skills.find((s) => s.id === editingId);
        if (!skill) return;
        saveSkill({ ...skill, name: draftName.trim() || 'Untitled', prompt: draftPrompt });
        setEditingId(null);
    }, [editingId, draftName, draftPrompt, skills, saveSkill]);

    const handleCancelEdit = useCallback(() => {
        const skill = skills.find((s) => s.id === editingId);
        if (skill && !skill.prompt && !draftPrompt.trim()) {
            removeSkill(skill.id);
        }
        setEditingId(null);
    }, [editingId, draftPrompt, skills, removeSkill]);

    // Auto-open editor for newly added skills (empty prompt)
    useEffect(() => {
        if (editingId) return;
        const newSkill = skills.find((s) => !s.prompt && s.name === 'New Skill');
        if (newSkill) {
            setEditingId(newSkill.id);
            setDraftName(newSkill.name);
            setDraftPrompt('');
        }
    }, [skills, editingId]);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[12px] text-slate-400">
                Skills are instruction blocks injected into every chat message. Add domain knowledge,
                data descriptions, or behavioral rules. Skills are saved to the server.
            </p>

            {skills.length === 0 && !editingId && (
                <div className="text-center py-6 text-[12px] text-slate-500">
                    No skills added yet. Click below to create one.
                </div>
            )}

            <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto">
                {skills.map((skill) => (
                    <div key={skill.id} className="border border-slate-700/50 rounded-lg bg-navy-950/60">
                        {editingId === skill.id ? (
                            <SkillEditor
                                name={draftName} prompt={draftPrompt}
                                onNameChange={setDraftName} onPromptChange={setDraftPrompt}
                                onSave={handleSaveEdit} onCancel={handleCancelEdit}
                            />
                        ) : (
                            <SkillRow skill={skill}
                                onToggle={() => handleToggle(skill)}
                                onEdit={() => handleEdit(skill)}
                                onDelete={() => handleDelete(skill.id)}
                            />
                        )}
                    </div>
                ))}
            </div>

            <button type="button" onClick={handleAdd} disabled={editingId !== null || isAdding}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-40 transition cursor-pointer">
                {isAdding ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                        <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                )}
                {isAdding ? 'Adding...' : 'Add Skill'}
            </button>
        </div>
    );
}

/* ── Sub-components ── */

interface SkillRowProps {
    skill: ChatSkill;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function SkillRow({ skill, onToggle, onEdit, onDelete }: SkillRowProps): React.ReactElement {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5">
            <button type="button" onClick={onToggle} title={skill.enabled ? 'Disable' : 'Enable'}
                className={`w-8 h-4 rounded-full relative transition cursor-pointer shrink-0 ${skill.enabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${skill.enabled ? 'left-4' : 'left-0.5'}`} />
            </button>
            <div className="flex-1 min-w-0">
                <span className={`text-[13px] font-medium ${skill.enabled ? 'text-slate-200' : 'text-slate-500'}`}>
                    {skill.name}
                </span>
                {skill.prompt && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{skill.prompt.slice(0, 100)}</p>
                )}
            </div>
            <button type="button" onClick={onEdit} title="Edit"
                className="p-1 text-slate-500 hover:text-slate-300 transition cursor-pointer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
            <button type="button" onClick={onDelete} title="Delete"
                className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </button>
        </div>
    );
}

interface SkillEditorProps {
    name: string; prompt: string;
    onNameChange: (v: string) => void; onPromptChange: (v: string) => void;
    onSave: () => void; onCancel: () => void;
}

function SkillEditor({ name, prompt, onNameChange, onPromptChange, onSave, onCancel }: SkillEditorProps): React.ReactElement {
    return (
        <div className="flex flex-col gap-2 p-3">
            <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)}
                placeholder="Skill name..." maxLength={80}
                className="px-2.5 py-1.5 text-[13px] bg-navy-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
            <textarea value={prompt} onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Describe what this skill teaches the agent..." rows={6} spellCheck={false}
                className="px-2.5 py-2 text-[12px] leading-relaxed bg-navy-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-y font-mono" />
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancel}
                    className="px-3 py-1 text-[12px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer">Cancel</button>
                <button type="button" onClick={onSave}
                    className="px-3 py-1 text-[12px] font-medium rounded bg-blue-500 text-white hover:bg-blue-400 transition cursor-pointer">Save</button>
            </div>
        </div>
    );
}
