/**
 * AgentSkillsList — Skill list with toggle/edit/delete for the agent settings panel.
 */
import React, { useState, useCallback, useEffect } from 'react';
import type { ChatSkill, AgentRole } from '../../core/store/slices/chatSlice';

interface SkillsListProps {
    skills: ChatSkill[];
    onToggle: (skill: ChatSkill) => void;
    onSave: (skill: ChatSkill) => void;
    onDelete: (id: string) => void;
}

export function AgentSkillsList({ skills, onToggle, onSave, onDelete }: SkillsListProps): React.ReactElement {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftPrompt, setDraftPrompt] = useState('');
    const [saveError, setSaveError] = useState('');

    const handleEdit = useCallback((skill: ChatSkill) => {
        setEditingId(skill.id);
        setDraftName(skill.name);
        setDraftPrompt(skill.prompt);
        setSaveError('');
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingId) return;
        const skill = skills.find((s) => s.id === editingId);
        if (!skill) return;
        try {
            await onSave({ ...skill, name: draftName.trim() || 'Untitled', prompt: draftPrompt });
            setEditingId(null);
            setSaveError('');
        } catch (e) {
            setSaveError((e as Error).message || 'Failed to save skill');
        }
    }, [editingId, draftName, draftPrompt, skills, onSave]);

    useEffect(() => {
        if (editingId) return;
        const newSkill = skills.find((s) => !s.prompt && s.name === 'New Skill');
        if (newSkill) handleEdit(newSkill);
    }, [skills, editingId, handleEdit]);

    if (skills.length === 0 && !editingId) {
        return <div className="text-[11px] text-slate-600 py-2">No additional skills.</div>;
    }

    return (
        <div className="flex flex-col gap-1.5 max-h-[30vh] overflow-y-auto">
            {skills.map((skill) => (
                <div key={skill.id} className="border border-slate-700/50 rounded bg-navy-950/60">
                    {editingId === skill.id ? (
                        <SkillEditor name={draftName} prompt={draftPrompt} error={saveError}
                            onNameChange={setDraftName} onPromptChange={setDraftPrompt}
                            onSave={handleSaveEdit} onCancel={() => setEditingId(null)} />
                    ) : (
                        <SkillRow skill={skill} onToggle={() => onToggle(skill)}
                            onEdit={() => handleEdit(skill)} onDelete={() => onDelete(skill.id)} />
                    )}
                </div>
            ))}
        </div>
    );
}

/* ── Skill Row ── */

interface SkillRowProps {
    skill: ChatSkill;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function SkillRow({ skill, onToggle, onEdit, onDelete }: SkillRowProps): React.ReactElement {
    return (
        <div className="flex items-center gap-2 px-2.5 py-2">
            <button type="button" onClick={onToggle} title={skill.enabled ? 'Disable' : 'Enable'}
                className={'w-7 h-3.5 rounded-full relative transition cursor-pointer shrink-0 ' + (skill.enabled ? 'bg-blue-500' : 'bg-slate-700')}>
                <span className={'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ' + (skill.enabled ? 'left-3.5' : 'left-0.5')} />
            </button>
            <div className="flex-1 min-w-0">
                <span className={'text-[12px] font-medium ' + (skill.enabled ? 'text-slate-200' : 'text-slate-500')}>
                    {skill.name}
                </span>
                {skill.prompt && <p className="text-[10px] text-slate-500 truncate mt-0.5">{skill.prompt.slice(0, 80)}</p>}
            </div>
            <button type="button" onClick={onEdit} title="Edit"
                className="p-0.5 text-slate-500 hover:text-slate-300 transition cursor-pointer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
            <button type="button" onClick={onDelete} title="Delete"
                className="p-0.5 text-slate-500 hover:text-red-400 transition cursor-pointer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </button>
        </div>
    );
}

/* ── Inline Editor ── */

interface SkillEditorProps {
    name: string; prompt: string; error?: string;
    onNameChange: (v: string) => void; onPromptChange: (v: string) => void;
    onSave: () => void; onCancel: () => void;
}

function SkillEditor({ name, prompt, error, onNameChange, onPromptChange, onSave, onCancel }: SkillEditorProps): React.ReactElement {
    return (
        <div className="flex flex-col gap-2 p-2.5">
            <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)}
                placeholder="Skill name..." maxLength={80}
                className="px-2 py-1 text-[12px] bg-navy-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
            <textarea value={prompt} onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Skill instructions..." rows={4} spellCheck={false}
                className="px-2 py-1.5 text-[11px] leading-relaxed bg-navy-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-y font-mono" />
            {error && <span className="text-[11px] text-red-400">{error}</span>}
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancel}
                    className="px-2.5 py-0.5 text-[11px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer">Cancel</button>
                <button type="button" onClick={onSave}
                    className="px-2.5 py-0.5 text-[11px] font-medium rounded bg-blue-500 text-white hover:bg-blue-400 transition cursor-pointer">Save</button>
            </div>
        </div>
    );
}

/* ── Add Skill Button ── */

interface AddSkillButtonProps {
    role: AgentRole;
    onCreate: (name: string, prompt: string, role: AgentRole, isSystemPrompt: boolean) => Promise<void>;
}

export function AddSkillButton({ role, onCreate }: AddSkillButtonProps): React.ReactElement {
    const [adding, setAdding] = useState(false);
    const handleAdd = useCallback(async () => {
        setAdding(true);
        try { await onCreate('New Skill', '', role, false); } finally { setAdding(false); }
    }, [role, onCreate]);

    return (
        <button type="button" onClick={handleAdd} disabled={adding}
            className="self-start flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-40 transition cursor-pointer">
            {adding ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                    <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
            ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            )}
            {adding ? 'Adding...' : 'Add Skill'}
        </button>
    );
}
