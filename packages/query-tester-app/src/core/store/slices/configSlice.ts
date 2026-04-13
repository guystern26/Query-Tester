/**
 * Config + Command Policy slice: admin Setup page CRUD + connectivity + policy management.
 * Merged from configSlice + commandPolicySlice (spec 9).
 */

import type {
    AppConfig, CommandPolicyEntry, ConfigStatus, ConnectionTestResult, EmailDetectResult,
} from '../../types/config';
import { DESTRUCTIVE_COMMANDS } from '../../constants/commandPolicy';
import { configApi } from '../../../api/configApi';
import { errMsg } from './helpers';

// --- State types (internal to this slice) ---

export interface ConfigState {
    appConfig: AppConfig | null;
    configStatus: ConfigStatus | null;
    isLoadingConfig: boolean;
    configError: string | null;
    isAdmin: boolean;
}

export interface CommandPolicyState {
    commandPolicy: CommandPolicyEntry[];
    isLoadingPolicy: boolean;
    policyError: string | null;
}

type ConfigStoreState = ConfigState & CommandPolicyState & { setupRequired: boolean };
type SetState = (recipe: (draft: ConfigStoreState) => void) => void;

// --- Initial state ---

export const configInitialState: ConfigState = {
    appConfig: null,
    configStatus: null,
    isLoadingConfig: false,
    configError: null,
    isAdmin: false,
};

export const commandPolicyInitialState: CommandPolicyState = {
    commandPolicy: [],
    isLoadingPolicy: false,
    policyError: null,
};

// --- Pure helpers ---

function enrichEntry(entry: CommandPolicyEntry): CommandPolicyEntry {
    return { ...entry, isDestructive: DESTRUCTIVE_COMMANDS.includes(entry.command) };
}

// --- Slice ---

export function configSlice(set: SetState) {
    return {
        // --- Config CRUD ---

        fetchAppConfig: async (): Promise<void> => {
            set((draft) => { draft.isLoadingConfig = true; draft.configError = null; });
            try {
                const config = await configApi.getConfig();
                set((draft) => { draft.appConfig = config; draft.isLoadingConfig = false; });
            } catch (e) {
                set((draft) => { draft.isLoadingConfig = false; draft.configError = errMsg(e); });
            }
        },

        fetchConfigStatus: async (): Promise<void> => {
            try {
                const status = await configApi.getConfigStatus();
                set((draft) => {
                    draft.configStatus = status;
                    draft.setupRequired = !status.configured;
                    draft.isAdmin = status.isAdmin;
                });
            } catch (e) {
                // In dev mode (no Splunk), don't lock the UI behind setup
                const isDev = typeof window !== 'undefined' && window.location.port === '3000';
                set((draft) => { draft.configError = errMsg(e); draft.setupRequired = !isDev; });
            }
        },

        saveConfigSection: async (
            plain: Partial<AppConfig>, secrets?: Record<string, string>,
        ): Promise<void> => {
            set((draft) => { draft.isLoadingConfig = true; draft.configError = null; });
            try {
                const config = await configApi.saveConfigSection(plain, secrets);
                set((draft) => { draft.appConfig = config; draft.isLoadingConfig = false; });
            } catch (e) {
                set((draft) => { draft.isLoadingConfig = false; draft.configError = errMsg(e); });
            }
        },

        testConnection: async (): Promise<ConnectionTestResult> => configApi.testConnection(),
        detectEmailConfig: async (): Promise<EmailDetectResult> => configApi.detectEmailConfig(),
        getSecret: async (name: string): Promise<string> => configApi.getSecret(name),

        // --- Command Policy CRUD ---

        fetchCommandPolicy: async (): Promise<void> => {
            set((draft) => { draft.isLoadingPolicy = true; draft.policyError = null; });
            try {
                const entries = await configApi.getCommandPolicy();
                set((draft) => { draft.commandPolicy = entries.map(enrichEntry); draft.isLoadingPolicy = false; });
            } catch (e) {
                set((draft) => { draft.isLoadingPolicy = false; draft.policyError = errMsg(e); });
            }
        },

        saveCommandPolicy: async (entries: CommandPolicyEntry[]): Promise<void> => {
            set((draft) => { draft.isLoadingPolicy = true; draft.policyError = null; });
            try {
                await configApi.saveCommandPolicy(entries);
                const refreshed = await configApi.getCommandPolicy();
                set((draft) => { draft.commandPolicy = refreshed.map(enrichEntry); draft.isLoadingPolicy = false; });
            } catch (e) {
                set((draft) => { draft.isLoadingPolicy = false; draft.policyError = errMsg(e); });
            }
        },

        resetCommandPolicy: async (): Promise<void> => {
            set((draft) => { draft.isLoadingPolicy = true; draft.policyError = null; });
            try {
                const defaults = await configApi.resetCommandPolicy();
                set((draft) => { draft.commandPolicy = defaults.map(enrichEntry); draft.isLoadingPolicy = false; });
            } catch (e) {
                set((draft) => { draft.isLoadingPolicy = false; draft.policyError = errMsg(e); });
            }
        },

        saveCommandPolicyEntry: async (entry: CommandPolicyEntry): Promise<void> => {
            let snapshot: CommandPolicyEntry[] = [];
            const enriched = enrichEntry(entry);
            set((draft) => {
                draft.policyError = null;
                snapshot = draft.commandPolicy.map((e) => ({ ...e }));
                const idx = draft.commandPolicy.findIndex((e) => e.command === entry.command);
                if (idx >= 0) { draft.commandPolicy[idx] = enriched; }
                else { draft.commandPolicy.push(enriched); }
            });
            try {
                await configApi.saveCommandPolicyEntry(entry);
                const refreshed = await configApi.getCommandPolicy();
                set((draft) => { draft.commandPolicy = refreshed.map(enrichEntry); });
            } catch (e) {
                set((draft) => { draft.commandPolicy = snapshot; draft.policyError = errMsg(e); });
            }
        },

        deleteCommandPolicyEntry: async (command: string): Promise<void> => {
            let snapshot: CommandPolicyEntry[] = [];
            set((draft) => {
                draft.policyError = null;
                snapshot = draft.commandPolicy.map((e) => ({ ...e }));
                draft.commandPolicy = draft.commandPolicy.filter((e) => e.command !== command);
            });
            try {
                await configApi.deleteCommandPolicyEntry(command);
            } catch (e) {
                set((draft) => { draft.commandPolicy = snapshot; draft.policyError = errMsg(e); });
            }
        },
    };
}
