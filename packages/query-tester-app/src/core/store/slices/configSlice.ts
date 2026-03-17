/**
 * Config slice: admin configuration CRUD + connectivity testing.
 */

import type { AppConfig, ConnectionTestResult, EmailDetectResult } from '../../types/config';
import { configApi } from '../../../api/configApi';
import type { SetState } from './configTypes';
import { errMsg } from './configTypes';

export type { ConfigState } from './configTypes';
export { configInitialState } from './configTypes';

export function configSlice(set: SetState) {
    return {
        fetchAppConfig: async (): Promise<void> => {
            set((draft) => {
                draft.isLoadingConfig = true;
                draft.configError = null;
            });
            try {
                const config = await configApi.getConfig();
                set((draft) => {
                    draft.appConfig = config;
                    draft.isLoadingConfig = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingConfig = false;
                    draft.configError = errMsg(e);
                });
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
                set((draft) => {
                    draft.configError = errMsg(e);
                    draft.setupRequired = true;
                });
            }
        },

        saveConfigSection: async (
            plain: Partial<AppConfig>,
            secrets?: Record<string, string>,
        ): Promise<void> => {
            set((draft) => {
                draft.isLoadingConfig = true;
                draft.configError = null;
            });
            try {
                const config = await configApi.saveConfigSection(plain, secrets);
                set((draft) => {
                    draft.appConfig = config;
                    draft.isLoadingConfig = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingConfig = false;
                    draft.configError = errMsg(e);
                });
            }
        },

        testConnection: async (): Promise<ConnectionTestResult> => {
            return configApi.testConnection();
        },

        detectEmailConfig: async (): Promise<EmailDetectResult> => {
            return configApi.detectEmailConfig();
        },

        getSecret: async (name: string): Promise<string> => {
            return configApi.getSecret(name);
        },
    };
}
