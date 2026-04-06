/**
 * Scheduled tests slice: CRUD + run history via scheduledTestsApi.
 */

import type { ScheduledTest, TestRunRecord } from '../../types';
import { scheduledTestsApi } from '../../../api/scheduledTestsApi';

export interface ScheduledTestsState {
    scheduledTests: ScheduledTest[];
    runHistory: Record<string, TestRunRecord[]>;
    isLoadingScheduled: boolean;
    isLoadingHistory: boolean;
    togglingScheduleId: string | null;
    creatingScheduleForTestId: string | null;
    scheduledError: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetState = (recipe: (draft: any) => void) => void;

export const scheduledTestsInitialState: ScheduledTestsState = {
    scheduledTests: [],
    runHistory: {},
    isLoadingScheduled: false,
    isLoadingHistory: false,
    togglingScheduleId: null,
    creatingScheduleForTestId: null,
    scheduledError: null,
};

export function scheduledTestsSlice(set: SetState) {
    return {
        fetchScheduledTests: async () => {
            set((draft) => {
                draft.scheduledError = null;
            });
            try {
                const tests = await scheduledTestsApi.getScheduledTests();
                set((draft) => {
                    draft.scheduledTests = Array.isArray(tests) ? tests : [];
                });
            } catch (e) {
                set((draft) => {
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        createScheduledTest: async (
            payload: Omit<ScheduledTest, 'id' | 'createdAt' | 'lastRunAt' | 'lastRunStatus'>
        ) => {
            set((draft) => {
                draft.isLoadingScheduled = true;
                draft.creatingScheduleForTestId = payload.testId;
                draft.scheduledError = null;
            });
            try {
                const created = await scheduledTestsApi.createScheduledTest(payload);
                set((draft) => {
                    draft.scheduledTests.push(created);
                    draft.isLoadingScheduled = false;
                    draft.creatingScheduleForTestId = null;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.creatingScheduleForTestId = null;
                    draft.scheduledError = e instanceof Error ? e.message : String(e);
                });
            }
        },

        updateScheduledTest: async (id: string, patch: Partial<ScheduledTest>) => {
            // Snapshot for rollback, then apply optimistically
            let snapshot: ScheduledTest | undefined;
            set((draft) => {
                draft.isLoadingScheduled = true;
                draft.togglingScheduleId = id;
                draft.scheduledError = null;
                const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                if (idx !== -1) {
                    snapshot = { ...draft.scheduledTests[idx] };
                    Object.assign(draft.scheduledTests[idx], patch);
                }
            });
            try {
                const updated = await scheduledTestsApi.updateScheduledTest(id, patch);
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.togglingScheduleId = null;
                    const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                    if (idx !== -1) {
                        draft.scheduledTests[idx] = updated;
                    }
                });
            } catch (e) {
                // Revert to snapshot on failure
                const isConflict = e instanceof Error && 'status' in e && (e as any).status === 409;
                set((draft) => {
                    draft.isLoadingScheduled = false;
                    draft.togglingScheduleId = null;
                    draft.scheduledError = isConflict
                        ? 'This schedule was modified by someone else — please refresh before updating.'
                        : (e instanceof Error ? e.message : String(e));
                    if (snapshot) {
                        const idx = draft.scheduledTests.findIndex((t) => t.id === id);
                        if (idx !== -1) {
                            draft.scheduledTests[idx] = snapshot;
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
                draft.isLoadingHistory = true;
                draft.scheduledError = null;
            });
            try {
                const records = await scheduledTestsApi.getRunHistory(scheduledTestId);
                set((draft) => {
                    draft.runHistory[scheduledTestId] = records;
                    draft.isLoadingHistory = false;
                });
            } catch (e) {
                set((draft) => {
                    draft.isLoadingHistory = false;
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
