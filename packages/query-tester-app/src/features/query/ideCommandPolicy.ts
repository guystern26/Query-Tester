/**
 * ideCommandPolicy — IDE-mode command policy and dangerous command detection.
 * Only blocks `delete`. Warns on side-effect commands but allows execution after confirmation.
 */
import type { CommandPolicyEntry } from 'core/types/config';

const P = (id: string, command: string, severity: 'danger' | 'warning' | 'info', label: string, allowed: boolean): CommandPolicyEntry => (
    { id, command, severity, label, allowed, isDefault: true, isDestructive: !allowed }
);

export const IDE_POLICY: CommandPolicyEntry[] = [
    P('1', 'delete', 'danger', 'delete is blocked — it permanently removes data.', false),
    P('2', 'outputlookup', 'warning', 'Writes data to a lookup file.', true),
    P('3', 'outputcsv', 'warning', 'Writes data to a CSV file.', true),
    P('4', 'collect', 'warning', 'Writes events to a summary index.', true),
    P('5', 'sendemail', 'warning', 'Sends an email.', true),
    P('6', 'rest', 'info', 'Calls Splunk REST endpoints.', true),
    P('7', 'tscollect', 'warning', 'Writes to a tsidx namespace.', true),
    P('8', 'script', 'info', 'Runs an external script.', true),
];

/** Commands that trigger a confirmation dialog before running in IDE mode. */
const DANGEROUS_COMMANDS = ['outputlookup', 'outputcsv', 'collect', 'sendemail', 'tscollect', 'mcollect', 'meventcollect'];

/** Scan SPL for dangerous commands. Returns found command names, empty if safe. */
export function findDangerousCommands(spl: string): string[] {
    const lower = spl.toLowerCase();
    return DANGEROUS_COMMANDS.filter((cmd) => {
        const re = new RegExp('\\|\\s*' + cmd + '\\b');
        return re.test(lower);
    });
}
