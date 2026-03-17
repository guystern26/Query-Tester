/**
 * Shared types for config and command policy store slices.
 */

import type {
    AppConfig,
    CommandPolicyEntry,
    ConfigStatus,
} from '../../types/config';

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

export type ConfigStoreState = ConfigState & CommandPolicyState & {
    setupRequired: boolean;
};

export type SetState = (recipe: (draft: ConfigStoreState) => void) => void;
export type GetState = () => ConfigStoreState;

export function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

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
