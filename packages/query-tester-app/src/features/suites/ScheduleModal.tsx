import React, { useState, useEffect, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { Modal } from '../../common';
import { DEFAULT_ALERT_EMAIL, SCHEDULE_INTERVALS } from 'core/constants/scheduledTests';
import { isValidCron } from './cronUtils';
import { IntervalPicker } from './IntervalPicker';
import { RecipientsList, hasInvalidRecipients } from './RecipientsList';
import type { ScheduledTest, SavedTestMeta } from 'core/types';

const selectCls = 'w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-300 cursor-pointer';

function reverseMapInterval(cron: string): string {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return '';
    const pattern = parts.slice(1).join(' ');
    for (const interval of SCHEDULE_INTERVALS) {
        const testCron = interval.buildCron(0);
        const testPattern = testCron.split(/\s+/).slice(1).join(' ');
        if (testPattern === pattern) return interval.key;
    }
    return '';
}

export interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    editingTest: ScheduledTest | null;
    preselectedTestId?: string | null;
}

export function ScheduleModal({ open, onClose, editingTest, preselectedTestId }: ScheduleModalProps) {
    const savedTests = useTestStore((s) => s.savedTests);
    const fetchSavedTests = useTestStore((s) => s.fetchSavedTests);
    const createScheduledTest = useTestStore((s) => s.createScheduledTest);
    const updateScheduledTest = useTestStore((s) => s.updateScheduledTest);
    const updateSavedTest = useTestStore((s) => s.updateSavedTest);
    const isLoadingScheduled = useTestStore((s) => s.isLoadingScheduled);

    const [testId, setTestId] = useState('');
    const [testName, setTestName] = useState('');
    const [cron, setCron] = useState('0 6 * * *');
    const [intervalKey, setIntervalKey] = useState('daily');
    const [enabled, setEnabled] = useState(true);
    const [alertOn, setAlertOn] = useState(false);
    const [recipients, setRecipients] = useState<string[]>([DEFAULT_ALERT_EMAIL]);

    useEffect(() => {
        if (open) fetchSavedTests();
    }, [open, fetchSavedTests]);

    useEffect(() => {
        if (!open) return;
        if (editingTest) {
            setTestId(editingTest.testId);
            const saved = savedTests.find((t) => t.id === editingTest.testId);
            setTestName(saved ? saved.name : editingTest.testName);
            setCron(editingTest.cronSchedule);
            const mapped = reverseMapInterval(editingTest.cronSchedule);
            setIntervalKey(mapped || editingTest.intervalKey || '');
            setEnabled(editingTest.enabled);
            setAlertOn(editingTest.alertOnFailure);
            setRecipients(editingTest.emailRecipients.length > 0 ? editingTest.emailRecipients : [DEFAULT_ALERT_EMAIL]);
        } else {
            setTestId(preselectedTestId || '');
            const pre = savedTests.find((t) => t.id === preselectedTestId);
            setTestName(pre ? pre.name : '');
            setCron('0 6 * * *');
            setIntervalKey('daily');
            setEnabled(true);
            setAlertOn(false);
            setRecipients([DEFAULT_ALERT_EMAIL]);
        }
    }, [open, editingTest, preselectedTestId]);

    const handleIntervalChange = useCallback((key: string, cronStr: string) => {
        setIntervalKey(key);
        setCron(cronStr);
    }, []);

    const selectedTest: SavedTestMeta | undefined = savedTests.find((t) => t.id === testId);
    const canSave = testId && testName.trim() && isValidCron(cron) && !hasInvalidRecipients(recipients) && !isLoadingScheduled;

    const handleSave = async () => {
        if (!canSave || !selectedTest) return;
        const finalRecipients = alertOn
            ? recipients.filter((r) => r.trim() !== '')
            : [DEFAULT_ALERT_EMAIL];

        // Rename the test if the name changed
        const trimmedName = testName.trim();
        if (trimmedName && trimmedName !== selectedTest.name) {
            updateSavedTest(selectedTest.id, trimmedName, selectedTest.description);
        }

        if (editingTest) {
            // Close immediately — updateScheduledTest applies optimistic update
            onClose();
            updateScheduledTest(editingTest.id, {
                cronSchedule: cron,
                intervalKey,
                enabled,
                alertOnFailure: alertOn,
                emailRecipients: finalRecipients,
            });
        } else {
            // Close immediately — creation continues in background
            onClose();
            createScheduledTest({
                testId: selectedTest.id,
                testName: trimmedName,
                app: selectedTest.app,
                savedSearchOrigin: selectedTest.savedSearchOrigin || null,
                cronSchedule: cron,
                intervalKey,
                enabled,
                alertOnFailure: alertOn,
                emailRecipients: finalRecipients,
                version: 1,
            });
        }
    };

    const confirmLabel = isLoadingScheduled ? 'Saving...' : 'Save';

    return (
        <Modal open={open} title={editingTest ? 'Edit Schedule' : 'Schedule a Test'} onClose={onClose} confirmLabel={canSave ? confirmLabel : undefined} onConfirm={canSave ? handleSave : undefined}>
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Test selector */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Test</label>
                    <select value={testId} onChange={(e) => setTestId(e.target.value)} className={selectCls} disabled={!!editingTest}>
                        <option value="">Select a saved test...</option>
                        {savedTests.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.app})</option>
                        ))}
                    </select>
                </div>

                {/* Test name */}
                {selectedTest && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-400">Test Name</label>
                        <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            maxLength={120}
                            placeholder="Test name..."
                            className="w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition-all duration-200"
                        />
                    </div>
                )}

                {/* SPL source toggle — linked to saved search vs current query */}
                {selectedTest && (
                    <div className="text-[11px] bg-navy-950 px-3 py-2.5 rounded-lg border border-slate-800">
                        {selectedTest.savedSearchOrigin ? (
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-slate-500">
                                    <span className="text-blue-400">&#8635;</span> Synced with saved search: <span className="text-slate-300 font-medium">{selectedTest.savedSearchOrigin}</span>
                                </div>
                                <button
                                    type="button"
                                    className="text-[11px] px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer transition-colors whitespace-nowrap"
                                    onClick={() => {
                                        // Unlink from saved search — cron runs will use the stored SPL
                                        if (editingTest) {
                                            updateScheduledTest(editingTest.id, { savedSearchOrigin: '' });
                                        }
                                        // Also clear on the savedTests metadata
                                        const meta = savedTests.find((t) => t.id === testId);
                                        if (meta) {
                                            meta.savedSearchOrigin = '';
                                        }
                                        fetchSavedTests();
                                    }}
                                >
                                    Use current query
                                </button>
                            </div>
                        ) : (
                            <span className="text-slate-500">
                                Using saved query <span className="text-slate-600">(not synced with a saved search)</span>
                            </span>
                        )}
                    </div>
                )}

                {/* Interval picker */}
                <IntervalPicker value={intervalKey} onChange={handleIntervalChange} />

                {/* Enabled toggle */}
                <label className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Enabled on save</span>
                    <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className={'relative w-9 h-5 rounded-full transition cursor-pointer ' + (enabled ? 'bg-blue-500' : 'bg-slate-700')}
                    >
                        <span className={'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ' + (enabled ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                </label>

                {/* Alert on failure toggle */}
                <label className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Alert on failure</span>
                    <button
                        type="button"
                        onClick={() => setAlertOn(!alertOn)}
                        className={'relative w-9 h-5 rounded-full transition cursor-pointer ' + (alertOn ? 'bg-blue-500' : 'bg-slate-700')}
                    >
                        <span className={'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ' + (alertOn ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                </label>

                {/* Recipients */}
                {alertOn && (
                    <RecipientsList recipients={recipients} onChange={setRecipients} />
                )}
            </div>
        </Modal>
    );
}
