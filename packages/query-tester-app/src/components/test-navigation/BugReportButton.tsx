import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectTests, selectTestResponse } from 'core/store/selectors';
import { createDefaultTest } from 'core/constants/defaults';
import type { BugReportPayload } from 'core/types';
import { Button, Modal, TextArea } from '../../common';
import { createRESTURL } from '@splunk/splunk-utils/url';
import { getDefaultFetchInit } from '@splunk/splunk-utils/fetch';
import { ENV } from '../../config/env';

type ReportType = 'bug' | 'feature';
type SendStatus = 'idle' | 'sending' | 'success' | 'error';

const REST_OPTS = { app: 'QueryTester', owner: 'admin' } as const;

async function submitReport(payload: BugReportPayload): Promise<void> {
    const url =
        createRESTURL(ENV.REST_PATH + '/bug_report', REST_OPTS) + '?output_mode=json';
    const defaults = getDefaultFetchInit();
    const res = await fetch(url, {
        method: 'POST',
        credentials: defaults.credentials as RequestCredentials,
        headers: {
            ...(defaults.headers as Record<string, string>),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        let msg = res.status + ' ' + res.statusText;
        try {
            const err = await res.json();
            if (err.error) msg = String(err.error);
        } catch {
            // use status text
        }
        throw new Error(msg);
    }
}

export function BugReportButton() {
    const state = useTestStore();
    const [open, setOpen] = useState(false);
    const [reportType, setReportType] = useState<ReportType>('bug');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<SendStatus>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const activeTest = selectActiveTest(state);
    const tests = selectTests(state);
    const testResponse = selectTestResponse(state);
    const currentTest = activeTest ?? tests[0] ?? createDefaultTest();

    const handleSend = async () => {
        if (!description.trim()) return;
        setStatus('sending');
        setErrorMsg('');
        const payload: BugReportPayload = {
            reportGeneratedAt: new Date().toISOString(),
            reportType,
            description,
            currentTest,
            allTests: tests.length > 0 ? tests : undefined,
            testResponse: testResponse ?? undefined,
        };
        try {
            await submitReport(payload);
            setStatus('success');
            setTimeout(() => {
                setDescription('');
                setStatus('idle');
                setOpen(false);
            }, 1500);
        } catch (e) {
            setStatus('error');
            setErrorMsg(e instanceof Error ? e.message : 'Failed to send report.');
        }
    };

    const handleClose = () => {
        if (status === 'sending') return;
        setOpen(false);
        setDescription('');
        setStatus('idle');
        setErrorMsg('');
    };

    return (
        <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                Bug report
            </Button>
            <Modal
                open={open}
                title="Bug report / Feature request"
                onClose={handleClose}
                confirmLabel={status === 'sending' ? 'Sending...' : 'Send'}
                onConfirm={handleSend}
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <span className="block text-[13px] text-slate-400 mb-1">Type</span>
                        <div className="flex gap-2">
                            <Button
                                variant={reportType === 'bug' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setReportType('bug')}
                            >
                                Bug Report
                            </Button>
                            <Button
                                variant={reportType === 'feature' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setReportType('feature')}
                            >
                                Feature Request
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[13px] text-slate-400 mb-1">
                            Description
                        </label>
                        <TextArea
                            value={description}
                            onChange={setDescription}
                            placeholder="Describe the issue or feature..."
                            rows={4}
                        />
                    </div>
                    {status === 'success' && (
                        <div className="px-3 py-2 rounded border-l-4 border-green-500 bg-green-500/10 text-[13px] text-green-400">
                            Report sent successfully!
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="px-3 py-2 rounded border-l-4 border-red-500 bg-red-500/10 text-[13px] text-red-400">
                            {errorMsg || 'Failed to send report.'}
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}
