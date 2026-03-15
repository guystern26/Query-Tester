import React, { useRef, useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { Button } from '../../common';
import { TestNavigation } from './TestNavigation';
import { BugReportButton } from './BugReportButton';
import { SaveTestModal } from './SaveTestModal';

export interface TopBarProps {
  onNavigateLibrary?: () => void;
}

export function TopBar({ onNavigateLibrary }: TopBarProps = {}) {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => state.saveToFile();

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(
      (content) => {
        const result = state.loadFromFile(content);
        if (!result.success) alert(result.error ?? 'Failed to load file');
      },
      () => alert('Failed to read file')
    );
    e.target.value = '';
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Save as new copy → navigate to Library so user sees their new test in the list
  const handleSaveNew = useCallback(async (name: string, description: string) => {
    await state.saveCurrentTest(name, description);
    setSaveModalOpen(false);
    if (!state.libraryError) {
      showToast('Test saved');
      if (onNavigateLibrary) onNavigateLibrary();
    }
  }, [state, showToast, onNavigateLibrary]);

  // Update existing → stay in Builder
  const handleUpdate = useCallback(async (id: string, name: string, description: string) => {
    await state.updateSavedTest(id, name, description);
    setSaveModalOpen(false);
    if (!state.libraryError) {
      showToast('Test updated');
    }
  }, [state, showToast]);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-navy-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleSave}>Export</Button>
          <Button variant="secondary" size="sm" onClick={handleLoadClick}>Import</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <div className="relative flex items-center">
            <Button variant="primary" size="sm" onClick={() => setSaveModalOpen(true)}>
              Save Test
            </Button>
            {state.hasUnsavedChanges && state.savedTestId && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-navy-900"
                title="Unsaved changes"
              />
            )}
          </div>
          <BugReportButton />
        </div>
        <div className="flex items-center gap-3">
          <TestNavigation />
          {onNavigateLibrary && (
            <nav className="flex items-center gap-1 ml-3 pl-3 border-l border-slate-700">
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer" onClick={onNavigateLibrary}>
                Library
              </button>
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-600/20 text-accent-300 cursor-pointer">
                Builder
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Success toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-green-900/90 border border-green-700 text-green-300 text-xs font-medium rounded-lg shadow-lg animate-fadeIn">
          {toast}
        </div>
      )}

      <SaveTestModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        initialName={activeTest?.name ?? ''}
        savedTestId={state.savedTestId}
        isSaving={state.isSaving}
        onSaveNew={handleSaveNew}
        onUpdate={handleUpdate}
      />
    </>
  );
}
