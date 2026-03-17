/**
 * Command policy slice: CRUD for SPL command policy entries.
 */

import type { CommandPolicyEntry } from '../../types/config';
import { DESTRUCTIVE_COMMANDS } from '../../constants/commandPolicy';
import { configApi } from '../../../api/configApi';
import type { SetState } from './configTypes';
import { errMsg } from './configTypes';

export type { CommandPolicyState } from './configTypes';
export { commandPolicyInitialState } from './configTypes';

function enrichEntry(entry: CommandPolicyEntry): CommandPolicyEntry {
    return {
        ...entry,
        isDestructive: DESTRUCTIVE_COMMANDS.includes(entry.command),
    };
}

export function commandPolicySlice(set: SetState) {
    return {
        fetchCommandPolicy: async (): Promise<void> => {
            set((draft) => {
                draft.isLoadingPolicy = true;
                draft.policyError = null;
            });
            try {
                const entries = await configApi.getCommandPolicy();
                set((draft) => {
                    draft.commandPolicy = entries.map(enrichEntry);
                    draft.isLoadingPolicy = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingPolicy = false;
                    draft.policyError = errMsg(e);
                });
            }
        },

        saveCommandPolicy: async (entries: CommandPolicyEntry[]): Promise<void> => {
            set((draft) => {
                draft.isLoadingPolicy = true;
                draft.policyError = null;
            });
            try {
                await configApi.saveCommandPolicy(entries);
                const refreshed = await configApi.getCommandPolicy();
                set((draft) => {
                    draft.commandPolicy = refreshed.map(enrichEntry);
                    draft.isLoadingPolicy = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingPolicy = false;
                    draft.policyError = errMsg(e);
                });
            }
        },

        resetCommandPolicy: async (): Promise<void> => {
            set((draft) => {
                draft.isLoadingPolicy = true;
                draft.policyError = null;
            });
            try {
                const defaults = await configApi.resetCommandPolicy();
                set((draft) => {
                    draft.commandPolicy = defaults.map(enrichEntry);
                    draft.isLoadingPolicy = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingPolicy = false;
                    draft.policyError = errMsg(e);
                });
            }
        },

        saveCommandPolicyEntry: async (entry: CommandPolicyEntry): Promise<void> => {
            // Snapshot for rollback, then apply optimistically
            let snapshot: CommandPolicyEntry[] = [];
            const enriched = enrichEntry(entry);
            set((draft) => {
                draft.policyError = null;
                snapshot = draft.commandPolicy.map((e) => ({ ...e }));
                const idx = draft.commandPolicy.findIndex((e) => e.command === entry.command);
                if (idx >= 0) {
                    draft.commandPolicy[idx] = enriched;
                } else {
                    draft.commandPolicy.push(enriched);
                }
            });
            try {
                await configApi.saveCommandPolicyEntry(entry);
                const refreshed = await configApi.getCommandPolicy();
                set((draft) => {
                    draft.commandPolicy = refreshed.map(enrichEntry);
                });
            } catch (e) {
                set((draft) => {
                    draft.commandPolicy = snapshot;
                    draft.policyError = errMsg(e);
                });
            }
        },

        deleteCommandPolicyEntry: async (command: string): Promise<void> => {
            // Snapshot for rollback, then remove optimistically
            let snapshot: CommandPolicyEntry[] = [];
            set((draft) => {
                draft.policyError = null;
                snapshot = draft.commandPolicy.map((e) => ({ ...e }));
                draft.commandPolicy = draft.commandPolicy.filter(
                    (e) => e.command !== command
                );
            });
            try {
                await configApi.deleteCommandPolicyEntry(command);
            } catch (e) {
                set((draft) => {
                    draft.commandPolicy = snapshot;
                    draft.policyError = errMsg(e);
                });
            }
        },
    };
}
