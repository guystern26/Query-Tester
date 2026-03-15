/**
 * Scheduled tests slice: CRUD + run history via scheduledTestsApi.
 */

import type { ScheduledTest, TestRunRecord } from '../../types';
import { scheduledTestsApi } from '../../../api/scheduledTestsApi';

export interface ScheduledTestsState {
    scheduledTests: ScheduledTest[];
    runHistory: Record<string, TestRunRecord[]>;
    isLoadingScheduled: boolean;
    scheduledError: string | null;
}

type SetState = (recipe: (draft: ScheduledTestsState) => void) => void;

export const scheduledTestsInitialState: ScheduledTestsState = {
    scheduledTests: [],
    runHistory: {},
    isLoadingScheduled: false,
    scheduledError: null,
};

export function scheduledTestsSlice(set: SetState) {
    return {
        fetchScheduledTests: async () => {
            set((draft) => {
                draft.isLoadingScheduled = true;
                draft.scheduledError = null;
            });
            try {
                const tests = await scheduledTestsApi.getScheduledTests();
                set((draft) => {
                    draft.scheduledTests = Array.isArray(tests) ? tests : [];
                    draft.isLoadingScheduled = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        createScheduledTest: async (
            payload: Omit<ScheduledTest, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus'>
        ) => {
            set((draft) => {
                draft.isLoadingScheduled = true;
                draft.scheduledError = null;
            });
            try {
                const created = await scheduledTestsApi.createScheduledTest(payload);
                set((draft) => {
                    draft.scheduledTests.push(created);
                    draft.isLoadingScheduled = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        updateScheduledTest: async (id: string, patch: Partial<ScheduledTest>) => {
            // Optimistic update — apply immediately so toggle feels instant
            const prev: ScheduledTest | undefined = undefined;
            set((draft) => {
                draft.scheduledError = null;
                const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                if (idx !== -1) {
                    Object.assign(draft.scheduledTests[idx], patch);
                }
            });
            try {
                const updated = await scheduledTestsApi.updateScheduledTest(id, patch);
                set((draft) => {
                    const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                    if (idx !== -1) {
                        draft.scheduledTests[idx] = updated;
                    }
                });
            } catch (e) {
                // Revert optimistic update on failure
                set((draft) => {
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                    const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                    if (idx !== -1) {
                        // Undo the patch
                        for (const key of Object.keys(patch)) {
                            if (key === 'enabled') {
                                (draft.scheduledTests[idx] as any)[key] = !(patch as any)[key];
                            }
                        }
                    }
                });
            }
        },

        deleteScheduledTest: async (id: string) => {
            set((draft) => {
                draft.scheduledError = null;
            });
            try {
                await scheduledTestsApi.deleteScheduledTest(id);
                set((draft) => {
                    draft.scheduledTests = draft.scheduledTests.filter((t) => t.id !== id);
                    delete draft.runHistory[id];
                });
            } catch (e) {
                set((draft) => {
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        runNow: async (id: string) => {
            set((draft) => {
                draft.isLoadingScheduled = true;
                draft.scheduledError = null;
            });
            try {
                const record = await scheduledTestsApi.runScheduledTestNow(id);
                set((draft) => {
                    if (!draft.runHistory[id]) {
                        draft.runHistory[id] = [];
                    }
                    draft.runHistory[id].unshift(record);
                    // Update last run info on the scheduled test
                    const test = draft.scheduledTests.find((t) => t.id === id);
                    if (test) {
                        test.lastRunAt = record.ranAt;
                        test.lastRunStatus = record.status;
                    }
                    draft.isLoadingScheduled = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        fetchRunHistory: async (scheduledTestId: string) => {
            set((draft) => {
                draft.scheduledError = null;
            });
            try {
                const records = await scheduledTestsApi.getRunHistory(scheduledTestId);
                set((draft) => {
                    draft.runHistory[scheduledTestId] = records;
                });
            } catch (e) {
                set((draft) => {
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        clearScheduledError: () => {
            set((draft) => {
                draft.scheduledError = null;
            });
        },
    };
}
