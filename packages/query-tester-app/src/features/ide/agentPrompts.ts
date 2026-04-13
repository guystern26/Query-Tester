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
        parts.push('\n## Raw Sample Events (auto-fetched — use internally, do not dump to user)');
        parts.push(formatContextTable(contextData.sampleRows, 5));
    }

    parts.push(SPLUNK_KNOWLEDGE);
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

const SPLUNK_KNOWLEDGE = `
## Splunk Quick Reference
- Standard fields: _time, _raw, source, sourcetype, host, index, _indextime, linecount, splunk_server
- CIM fields: action, app, dest, dest_ip, dest_port, dvc, src, src_ip, src_port, status, user, vendor_product
- stats = aggregates (removes raw events), eventstats = appends agg columns to every row, streamstats = running/cumulative row-by-row
- transaction: always set maxspan to avoid runaway grouping
- Multi-valued: mvexpand to flatten, values() in stats produces mv fields, mvjoin to display
- cache() macro: cache(lookup, id_fields, prop_fields, stacking, testing, vanish) — enrichment lookup. When testing!=true, lookup is auto-swapped with a temp copy
`;

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

To debug the current query pipe-by-pipe (runs each prefix, stops where results drop to 0):
~~~action:debug_pipeline
~~~

To fetch data from the Splunk REST API (read-only, result feeds back to you automatically):
~~~action:splunk_rest
{"path": "services/saved/searches", "params": {"count": "10", "search": "name=my_alert*"}}
~~~
You can also pass a plain path without JSON:
~~~action:splunk_rest
services/data/indexes
~~~

Available REST endpoints you can query:

**Saved Searches & Alerts:**
- services/saved/searches — all saved searches and alerts across all apps
- servicesNS/-/{app}/saved/searches — saved searches in a specific app (replace {app} with the app name)
- services/saved/searches/{name} — details of a specific saved search by name
- services/alerts/fired_alerts — recently fired alerts across all apps
- servicesNS/-/{app}/alerts/fired_alerts — fired alerts in a specific app

**Data Configuration:**
- services/data/indexes — all available indexes (name, maxDataSizeMB, currentDBSizeMB, totalEventCount)
- services/data/indexes/{name} — details of a specific index
- services/data/props/sourcetypes — all configured sourcetypes
- servicesNS/-/{app}/data/props/sourcetypes — sourcetypes in a specific app

**Lookups:**
- services/data/lookup-table-files — CSV lookup files (filename, app)
- services/data/transforms/lookups — lookup definitions (name, filename, fields)

**Macros:**
- services/admin/macros — all search macros (name, definition, args)
- servicesNS/-/{app}/admin/macros — macros in a specific app

**Apps & Server:**
- services/apps/local — installed Splunk apps (name, label, version, visible)
- services/server/info — Splunk server info (version, build, os, guid)

**Useful params:** Use "search" param to filter by name, e.g. {"path": "services/saved/searches", "params": {"search": "name=my_alert*", "count": "20"}}.

Use splunk_rest when you need Splunk configuration data to help the user. The results are auto-fetched and fed back to you. Use namespace-scoped endpoints (servicesNS/-/{app}/...) when the user is working in a specific app context.

When the user asks to debug, ALWAYS use debug_pipeline first. It will automatically find the problematic pipe stage.

NEVER use auto_query with data-modifying commands (delete, outputlookup, collect, etc.).
NEVER add /* */ or // comments inside SPL queries — they break SPL. Splunk only supports \`\`\`comment\`\`\` (triple backtick) comments. Prefer explaining in your message text instead of inline comments.
Only use actions when they clearly help. Always explain what the action does.`;
