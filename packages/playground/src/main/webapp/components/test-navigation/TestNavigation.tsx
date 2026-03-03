import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import {
  selectActiveTest,
  selectActiveTestId,
  selectTests,
  selectTestCount,
  selectActiveTestIndex,
} from 'core/store/selectors';
import { MAX_TESTS_PER_SESSION } from 'core/constants/limits';
import { Button, Modal } from '../../common';

export function TestNavigation() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const activeTestId = selectActiveTestId(state);
  const tests = selectTests(state);
  const count = selectTestCount(state);
  const activeIndex = selectActiveTestIndex(state);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < count - 1;
  const canAdd = count < MAX_TESTS_PER_SESSION;
  const canDelete = count > 1;

  const goPrev = () => {
    if (!canGoPrev) return;
    const prev = tests[activeIndex - 1];
    if (prev) state.setActiveTest(prev.id);
  };

  const goNext = () => {
    if (!canGoNext) return;
    const next = tests[activeIndex + 1];
    if (next) state.setActiveTest(next.id);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTestId) state.updateTestName(activeTestId, e.target.value);
  };

  const displayIndex = activeIndex >= 0 ? activeIndex + 1 : 0;
  const counterText = count > 0 ? `(${displayIndex} of ${count})` : '(0 of 0)';

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={goPrev} disabled={!canGoPrev}>‹ Prev</Button>
        <Button variant="secondary" size="sm" onClick={goNext} disabled={!canGoNext}>Next ›</Button>
        <input
          type="text"
          value={activeTest?.name ?? ''}
          onChange={handleNameChange}
          placeholder="Put your test name here..."
          className="min-w-[160px] px-3 py-1.5 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
        />
        <span className="text-[13px] text-slate-400">{counterText}</span>
        <Button variant="primary" size="sm" onClick={() => state.addTest()} disabled={!canAdd}>New</Button>
        <Button variant="secondary" size="sm" onClick={() => activeTestId && state.duplicateTest(activeTestId)} disabled={!activeTestId}>Duplicate</Button>
        <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)} disabled={!canDelete}>Delete</Button>
      </div>

      <Modal
        open={deleteModalOpen}
        title="Delete test?"
        onClose={() => setDeleteModalOpen(false)}
        confirmLabel="Delete"
        onConfirm={() => { if (activeTestId) state.deleteTest(activeTestId); setDeleteModalOpen(false); }}
        variant="danger"
      >
        <p className="m-0">Delete &quot;{activeTest?.name ?? 'this test'}&quot;? This cannot be undone.</p>
      </Modal>
    </>
  );
}
