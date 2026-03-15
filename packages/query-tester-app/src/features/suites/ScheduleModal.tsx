import React, { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { Modal } from '../../common';
import { DEFAULT_ALERT_EMAIL } from 'core/constants/scheduledTests';
import { CronPicker, isValidCron } from './CronPicker';
import { RecipientsList, hasInvalidRecipients } from './RecipientsList';
import type { ScheduledTest, SavedTestMeta } from 'core/types';

const selectCls = 'w-full px-3 py-2 text-sm bg-navy-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-accent-600 cursor-pointer';

export interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    editingTest: ScheduledTest | null;
    preselectedTestId?: string | null;
}

export function ScheduleModal({ open, onClose, editingTest, preselectedTestId }: ScheduleModalProps) {
    const { savedTests, fetchSavedTests, createScheduledTest, updateScheduledTest, isLoadingScheduled } = useTestStore();

    const [testId, setTestId] = useState('');
    const [cron, setCron] = useState('0 6 * * *');
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
            setCron(editingTest.cronSchedule);
            setEnabled(editingTest.enabled);
            setAlertOn(editingTest.alertOnFailure);
            setRecipients(editingTest.emailRecipients.length > 0 ? editingTest.emailRecipients : [DEFAULT_ALERT_EMAIL]);
        } else {
            setTestId(preselectedTestId || '');
            setCron('0 6 * * *');
            setEnabled(true);
            setAlertOn(false);
            setRecipients([DEFAULT_ALERT_EMAIL]);
        }
    }, [open, editingTest, preselectedTestId]);

    const selectedTest: SavedTestMeta | undefined = savedTests.find((t) => t.id === testId);
    const canSave = testId && isValidCron(cron) && !hasInvalidRecipients(recipients) && !isLoadingScheduled;

    const handleSave = async () => {
        if (!canSave || !selectedTest) return;
        const finalRecipients = alertOn
            ? recipients.filter((r) => r.trim() !== '')
            : [DEFAULT_ALERT_EMAIL];

        if (editingTest) {
            // Close immediately — updateScheduledTest applies optimistic update
            onClose();
            updateScheduledTest(editingTest.id, {
                cronSchedule: cron,
                enabled,
                alertOnFailure: alertOn,
                emailRecipients: finalRecipients,
            });
        } else {
            // Close immediately — creation continues in background
            onClose();
            createScheduledTest({
                testId: selectedTest.id,
                testName: selectedTest.name,
                app: selectedTest.app,
                savedSearchOrigin: null,
                cronSchedule: cron,
                enabled,
                alertOnFailure: alertOn,
                emailRecipients: finalRecipients,
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

                {/* Linked saved search info */}
                {selectedTest && (
                    <div className="text-[11px] text-slate-500 bg-navy-950 px-3 py-2 rounded-lg border border-slate-800">
                        SPL is static (not linked to a saved search)
                    </div>
                )}

                {/* Cron picker */}
                <CronPicker value={cron} onChange={setCron} />

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
