import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import {
  selectActiveTest,
  selectTests,
  selectTestResponse,
} from 'core/store/selectors';
import { createDefaultTest } from 'core/constants/defaults';
import type { BugReportPayload } from 'core/types';
import { Button, Modal, TextArea } from '../../common';

type ReportType = 'bug' | 'feature';

function downloadJson(payload: BugReportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${payload.reportType}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openMailto(reportType: ReportType, description: string) {
  const subject = encodeURIComponent(
    reportType === 'bug' ? 'Bug Report: Splunk Query Tester' : 'Feature Request: Splunk Query Tester'
  );
  const body = encodeURIComponent(
    `${description}\n\n---\nPlease attach the downloaded JSON file for full test state and results.`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function BugReportButton() {
  const state = useTestStore();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('bug');
  const [description, setDescription] = useState('');

  const activeTest = selectActiveTest(state);
  const tests = selectTests(state);
  const testResponse = selectTestResponse(state);
  const currentTest = activeTest ?? tests[0] ?? createDefaultTest();

  const handleSend = () => {
    const payload: BugReportPayload = {
      reportGeneratedAt: new Date().toISOString(),
      reportType,
      description,
      currentTest,
      allTests: tests.length > 0 ? tests : undefined,
      testResponse: testResponse ?? undefined,
    };
    downloadJson(payload);
    openMailto(reportType, description);
    setDescription('');
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
    setDescription('');
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
        confirmLabel="Send"
        onConfirm={handleSend}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-lg)' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--radius-sm)', display: 'block' }}>
              Type
            </span>
            <div style={{ display: 'flex', gap: 'var(--radius-md)' }}>
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
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--radius-sm)', display: 'block' }}>
              Description
            </label>
            <TextArea
              value={description}
              onChange={setDescription}
              placeholder="Describe the issue or feature..."
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
