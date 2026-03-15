/**
 * useLoadLastRun — loads the last scheduled run result for a test
 * and sets it as the TestResponse in the store.
 */
import { useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { TestResponse, ScenarioResult, ScheduledTest } from 'core/types';
import { scheduledTestsApi } from '../api/scheduledTestsApi';
import { EMPTY_SPL_ANALYSIS } from '../features/results/resultHelpers';

export function useLoadLastRun(): (testId: string) => void {
    const scheduledTests = useTestStore((s) => s.scheduledTests);
    const setTestResponse = useTestStore((s) => s.setTestResponse);

    return useCallback(
        (testId: string) => {
            const tryLoad = (scheds: ScheduledTest[]) => {
                const sched = scheds.find((s) => s.testId === testId);
                if (!sched || !sched.lastRunAt) return;

                scheduledTestsApi
                    .getRunHistory(sched.id)
                    .then((records) => {
                        if (!records || records.length === 0) return;
                        const last = records[0];
                        const scenarios = (last.scenarioResults || []) as Array<{
                            scenarioName?: string;
                            passed?: boolean;
                            message?: string;
                        }>;

                        const scenarioResults: ScenarioResult[] = scenarios.map((sr) => {
                            const msg = sr.message || '';
                            const parts = msg ? msg.split('; ').filter(Boolean) : [];
                            const validations = parts.map((p) => ({
                                field: '',
                                condition: '',
                                expected: '',
                                actual: '',
                                passed: !!sr.passed,
                                message: p,
                            }));
                            return {
                                scenarioName: sr.scenarioName || '',
                                passed: !!sr.passed,
                                executionTimeMs: 0,
                                resultCount: 0,
                                injectedSpl: '',
                                validations,
                                resultRows: [],
                                error: null,
                            };
                        });

                        const passed = scenarioResults.filter((s) => s.passed).length;
                        const total = scenarioResults.length;
                        const statusMap: Record<string, TestResponse['status']> = {
                            pass: 'pass',
                            fail: 'fail',
                            partial: 'partial',
                            error: 'error',
                        };

                        const response: TestResponse = {
                            status: statusMap[last.status] || 'error',
                            message: 'Last run ' + new Date(last.ranAt).toLocaleString(),
                            testName: sched.testName,
                            testType: 'standard',
                            timestamp: last.ranAt,
                            totalScenarios: total,
                            passedScenarios: passed,
                            warnings: [],
                            splAnalysis: EMPTY_SPL_ANALYSIS,
                            scenarioResults,
                        };
                        setTestResponse(response);
                    })
                    .catch(() => {
                        /* ignore */
                    });
            };

            if (scheduledTests.length > 0) {
                tryLoad(scheduledTests);
                return;
            }
            scheduledTestsApi
                .getScheduledTests()
                .then((fetched) => {
                    tryLoad(Array.isArray(fetched) ? fetched : []);
                })
                .catch(() => {
                    /* ignore */
                });
        },
        [scheduledTests, setTestResponse],
    );
}
