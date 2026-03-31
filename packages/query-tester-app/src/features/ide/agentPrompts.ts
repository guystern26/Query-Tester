/**
 * agentPrompts.ts — Prompt builders for the multi-agent pipeline.
 * Builds system prompts for manager routing, specialist context, and validator checks.
 */

import type { AgentRoleConfig } from './agentLoop';
import type { ChatContextData } from '../../api/chatPrompts';

function buildSkillsBlock(skills: Array<{ name: string; prompt: string }>): string {
    if (skills.length === 0) return '';
    return '\n\n# Additional Skills\n\n' +
        skills.map((s) => '## ' + s.name + '\n' + s.prompt).join('\n\n');
}

function formatContextTable(rows: Record<string, string>[], max: number): string {
    if (!rows || rows.length === 0) return 'No data.';
    const subset = rows.slice(0, max);
    const keys = Object.keys(subset[0]);
    const header = '| ' + keys.join(' | ') + ' |';
    const sep = '| ' + keys.map(() => '---').join(' | ') + ' |';
    const body = subset
        .map((r) => '| ' + keys.map((k) => String(r[k] ?? '').slice(0, 80)).join(' | ') + ' |')
        .join('\n');
    return header + '\n' + sep + '\n' + body;
}

/**
 * Build the manager's routing prompt. Lightweight — no heavy context.
 */
export function buildManagerRoutingPrompt(
    managerConfig: AgentRoleConfig,
    spl: string,
    app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    specialists: Record<string, AgentRoleConfig>,
    userMessage: string,
): string {
    const parts: string[] = [managerConfig.systemPrompt];
    parts.push(buildSkillsBlock(managerConfig.skills));
    parts.push('\n---\n');
    parts.push('# Routing Context');
    parts.push('App: ' + (app || 'not set'));
    if (timeRange) parts.push('Time range: ' + timeRange.earliest + ' to ' + timeRange.latest);
    parts.push('SPL (first 500 chars): ' + (spl || '(empty)').slice(0, 500));
    parts.push('\n# Available Specialists');
    for (const [name, cfg] of Object.entries(specialists)) {
        const skillNames = cfg.skills.map((s) => s.name);
        parts.push('- **' + name + '**: ' + cfg.systemPrompt.slice(0, 120));
        if (skillNames.length > 0) parts.push('  Skills: ' + skillNames.join(', '));
    }
    parts.push('\nUser message: ' + userMessage);
    parts.push('\nRespond with ONLY a JSON object: {"specialist": "<name>"}');
    return parts.join('\n');
}

/**
 * Build a specialist's full system prompt with all context.
 */
export function buildSpecialistPrompt(
    specialistConfig: AgentRoleConfig,
    spl: string,
    app: string,
    timeRange: { earliest: string; latest: string } | undefined,
    contextData: ChatContextData,
): string {
    const parts: string[] = [specialistConfig.systemPrompt];
    parts.push(buildSkillsBlock(specialistConfig.skills));
    parts.push('\n---\n');
    parts.push('# Auto-injected Context');
    parts.push('## Current Query\n```spl\n' + (spl || '(empty)') + '\n```');
    parts.push('App: ' + (app || 'not set'));
    if (timeRange) parts.push('Time range: ' + timeRange.earliest + ' to ' + timeRange.latest);

    if (contextData.queryError) {
        parts.push('\n## Query Error\n```\n' + contextData.queryError + '\n```');
    } else if (contextData.queryRows && contextData.queryRows.length > 0) {
        const total = contextData.queryResultCount ?? contextData.queryRows.length;
        parts.push('\n## Query Output (' + total + ' total rows)');
        parts.push(formatContextTable(contextData.queryRows, 10));
    }
    if (contextData.sampleRows && contextData.sampleRows.length > 0) {
        parts.push('\n## Raw Sample Events');
        parts.push(formatContextTable(contextData.sampleRows, 5));
    }

    parts.push(SPECIALIST_ACTION_INSTRUCTIONS);
    return parts.join('\n');
}

/**
 * Build the validator's system prompt.
 */
export function buildValidatorPrompt(
    validatorConfig: AgentRoleConfig,
    userRequest: string,
    specialistResponse: string,
    spl: string,
    app: string,
): string {
    const parts: string[] = [validatorConfig.systemPrompt];
    parts.push(buildSkillsBlock(validatorConfig.skills));
    parts.push('\n---\n');
    parts.push('# Validation Context');
    parts.push('## User Request\n' + userRequest);
    parts.push('\n## Specialist Response\n' + specialistResponse);
    parts.push('\n## Current SPL\n```spl\n' + (spl || '(empty)') + '\n```');
    parts.push('App: ' + (app || 'not set'));
    parts.push('\nRespond with ONLY a JSON object: {"valid": true} or {"valid": false, "feedback": "..."}');
    return parts.join('\n');
}

const SPECIALIST_ACTION_INSTRUCTIONS = `
## Response Actions
You can embed actions in your response:

To suggest running a read-only query:
~~~action:run_query
index=main sourcetype=access_combined | head 10
~~~

To replace the editor SPL:
~~~action:update_spl
index=main sourcetype=access_combined | stats count by status
~~~

To auto-execute a read-only query (result feeds back to you automatically):
~~~action:auto_query
index=main sourcetype=access_combined | stats count by sourcetype | head 5
~~~

To debug the current query pipe-by-pipe (runs each prefix automatically):
~~~action:debug_pipeline
~~~

NEVER use auto_query with data-modifying commands (delete, outputlookup, collect, etc.).
Only use actions when they clearly help. Always explain what the action does.`;
