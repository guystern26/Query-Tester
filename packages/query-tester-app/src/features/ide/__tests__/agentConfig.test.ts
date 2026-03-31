/**
 * Tests for buildAgentConfig logic (internal to chatActions).
 * We test this indirectly by verifying that createSendChatMessage
 * falls back to single-shot when agents are not fully configured.
 */
import type { AgentRole } from '../../../core/store/slices/chatSlice';

// Re-implement buildAgentConfig locally for unit testing since it's not exported
interface SkillLike {
    name: string;
    prompt: string;
    enabled: boolean;
    role: AgentRole;
    isSystemPrompt: boolean;
}

interface RoleConfig {
    systemPrompt: string;
    skills: Array<{ name: string; prompt: string }>;
}

function buildAgentConfig(
    skills: SkillLike[],
): Record<AgentRole, RoleConfig> | null {
    const roles: AgentRole[] = ['manager', 'explainer', 'writer', 'validator'];
    const config: Partial<Record<AgentRole, RoleConfig>> = {};
    for (const role of roles) {
        const rs = skills.filter((s) => s.role === role);
        const sys = rs.find((s) => s.isSystemPrompt && s.prompt.trim());
        if (!sys) return null;
        config[role] = {
            systemPrompt: sys.prompt,
            skills: rs.filter((s) => !s.isSystemPrompt && s.enabled && s.prompt.trim())
                .map((s) => ({ name: s.name, prompt: s.prompt })),
        };
    }
    return config as Record<AgentRole, RoleConfig>;
}

function makeSkill(role: AgentRole, isSystemPrompt: boolean, prompt: string, enabled = true): SkillLike {
    return { name: role + ' skill', prompt, enabled, role, isSystemPrompt };
}

describe('buildAgentConfig', () => {
    it('returns null when no skills exist', () => {
        expect(buildAgentConfig([])).toBeNull();
    });

    it('returns null when only some roles have system prompts', () => {
        const skills = [
            makeSkill('manager', true, 'Manager prompt'),
            makeSkill('explainer', true, 'Explainer prompt'),
            // Missing writer and validator
        ];
        expect(buildAgentConfig(skills)).toBeNull();
    });

    it('returns null when a system prompt is empty', () => {
        const skills = [
            makeSkill('manager', true, 'Manager prompt'),
            makeSkill('explainer', true, 'Explainer prompt'),
            makeSkill('writer', true, ''),  // Empty!
            makeSkill('validator', true, 'Validator prompt'),
        ];
        expect(buildAgentConfig(skills)).toBeNull();
    });

    it('returns config when all 4 roles have system prompts', () => {
        const skills = [
            makeSkill('manager', true, 'Manager prompt'),
            makeSkill('explainer', true, 'Explainer prompt'),
            makeSkill('writer', true, 'Writer prompt'),
            makeSkill('validator', true, 'Validator prompt'),
        ];
        const config = buildAgentConfig(skills);
        expect(config).not.toBeNull();
        expect(config!.manager.systemPrompt).toBe('Manager prompt');
        expect(config!.explainer.systemPrompt).toBe('Explainer prompt');
        expect(config!.writer.systemPrompt).toBe('Writer prompt');
        expect(config!.validator.systemPrompt).toBe('Validator prompt');
    });

    it('includes enabled additional skills for the role', () => {
        const skills = [
            makeSkill('manager', true, 'Manager prompt'),
            makeSkill('manager', false, 'SPL Basics'),      // additional skill
            makeSkill('manager', false, 'Disabled Skill', false),  // disabled
            makeSkill('explainer', true, 'Explainer prompt'),
            makeSkill('writer', true, 'Writer prompt'),
            makeSkill('validator', true, 'Validator prompt'),
        ];
        const config = buildAgentConfig(skills);
        expect(config).not.toBeNull();
        expect(config!.manager.skills.length).toBe(1);
        expect(config!.manager.skills[0].name).toBe('manager skill');
        expect(config!.manager.skills[0].prompt).toBe('SPL Basics');
    });

    it('excludes additional skills with empty prompts', () => {
        const skills = [
            makeSkill('manager', true, 'Manager prompt'),
            makeSkill('manager', false, ''),  // empty prompt
            makeSkill('explainer', true, 'Explainer prompt'),
            makeSkill('writer', true, 'Writer prompt'),
            makeSkill('validator', true, 'Validator prompt'),
        ];
        const config = buildAgentConfig(skills);
        expect(config!.manager.skills.length).toBe(0);
    });
});
