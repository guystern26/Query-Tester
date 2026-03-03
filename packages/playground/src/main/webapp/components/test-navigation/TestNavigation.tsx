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

  const handleNew = () => state.addTest();
  const handleDuplicate = () => activeTestId && state.duplicateTest(activeTestId);

  const openDeleteModal = () => setDeleteModalOpen(true);
  const closeDeleteModal = () => setDeleteModalOpen(false);
  const confirmDelete = () => {
    if (activeTestId) state.deleteTest(activeTestId);
    closeDeleteModal();
  };

  const displayIndex = activeIndex >= 0 ? activeIndex + 1 : 0;
  const counterText = count > 0 ? `(${displayIndex} of ${count})` : '(0 of 0)';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--radius-md)', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={goPrev} disabled={!canGoPrev}>
          ‹ Prev
        </Button>
        <Button variant="secondary" size="sm" onClick={goNext} disabled={!canGoNext}>
          Next ›
        </Button>
        <input
          type="text"
          value={activeTest?.name ?? ''}
          onChange={handleNameChange}
          placeholder="Put your test name here..."
          style={{
            padding: 'var(--radius-sm) var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            minWidth: 160,
            fontSize: '1rem',
          }}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{counterText}</span>
        <Button variant="primary" size="sm" onClick={handleNew} disabled={!canAdd}>
          New
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDuplicate} disabled={!activeTestId}>
          Duplicate
        </Button>
        <Button variant="danger" size="sm" onClick={openDeleteModal} disabled={!canDelete}>
          Delete
        </Button>
      </div>

      <Modal
        open={deleteModalOpen}
        title="Delete test?"
        onClose={closeDeleteModal}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="danger"
      >
        <p style={{ margin: 0 }}>
          Delete &quot;{activeTest?.name ?? 'this test'}&quot;? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
