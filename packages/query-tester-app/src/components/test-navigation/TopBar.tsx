import React, { useRef, useState, useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { Button } from '../../common';
import { TestNavigation } from './TestNavigation';
import { BugReportButton } from './BugReportButton';
import { GearIcon } from '../GearIcon';
import { SaveTestModal } from './SaveTestModal';
import { TutorialLaunchButton } from '../../features/tutorial/TutorialLaunchButton';
import { DestinationActions } from '../../features/ide/DestinationActions';

export interface TopBarProps {
  mode?: 'builder' | 'ide';
  onNavigateLibrary?: () => void;
  onNavigateSetup?: () => void;
  onStartTutorial?: () => void;
}

export function TopBar({ mode = 'builder', onNavigateLibrary, onNavigateSetup, onStartTutorial }: TopBarProps = {}) {
  const activeTest = useTestStore(selectActiveTest);
  const isAdmin = useTestStore((s) => s.isAdmin);
  const setupRequired = useTestStore((s) => s.setupRequired);
  const hasUnsavedChanges = useTestStore((s) => s.hasUnsavedChanges);
  const savedTestId = useTestStore((s) => s.savedTestId);
  const isSaving = useTestStore((s) => s.isSaving);
  const saveToFile = useTestStore((s) => s.saveToFile);
  const loadFromFile = useTestStore((s) => s.loadFromFile);
  const saveCurrentTest = useTestStore((s) => s.saveCurrentTest);
  const updateSavedTest = useTestStore((s) => s.updateSavedTest);
  const resetToNewTest = useTestStore((s) => s.resetToNewTest);
  const setResultsBarExpanded = useTestStore((s) => s.setResultsBarExpanded);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleClearClick = useCallback(() => setClearConfirmOpen(true), []);
  const handleClearConfirm = useCallback(() => {
    setClearConfirmOpen(false);
    resetToNewTest();
  }, [resetToNewTest]);
  const handleClearCancel = useCallback(() => setClearConfirmOpen(false), []);

  const handleSave = () => saveToFile();

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(
      (content) => {
        const result = loadFromFile(content);
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
    await saveCurrentTest(name, description);
    setSaveModalOpen(false);
    if (!useTestStore.getState().libraryError) {
      showToast('Test saved');
      if (onNavigateLibrary) onNavigateLibrary();
    }
  }, [saveCurrentTest, showToast, onNavigateLibrary]);

  // Update existing → stay in Builder
  const handleUpdate = useCallback(async (id: string, name: string, description: string) => {
    await updateSavedTest(id, name, description);
    setSaveModalOpen(false);
    if (!useTestStore.getState().libraryError) {
      showToast('Test updated');
    }
  }, [updateSavedTest, showToast]);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-navy-800 border-b border-slate-700/30 px-5 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2">
          {mode === 'ide' ? (
            <DestinationActions />
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={handleClearClick}>Clear</Button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <div className="relative flex items-center" data-tutorial="save-test-btn">
                <Button variant="primary" size="sm" className="bg-green-500 hover:bg-green-400 text-white" onClick={() => { setResultsBarExpanded(false); setSaveModalOpen(true); }}>
                  Save Test
                </Button>
                {hasUnsavedChanges && savedTestId && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-navy-900"
                    title="Unsaved changes"
                  />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onStartTutorial && <TutorialLaunchButton onClick={onStartTutorial} />}
          <TestNavigation />
          {onNavigateLibrary && (
            <nav className="flex items-center gap-1 ml-3 pl-3 border-l border-slate-700">
              <BugReportButton />
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition cursor-pointer" onClick={onNavigateLibrary}>
                Library
              </button>
              <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy-700 text-white border-2 border-slate-600 cursor-pointer">
                Builder
              </button>
              {isAdmin && onNavigateSetup && (
                <button type="button" onClick={onNavigateSetup} className="ml-1 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer rounded-lg hover:bg-navy-800">
                  <GearIcon />
                </button>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Setup required banner (admin only) */}
      {isAdmin && setupRequired && onNavigateSetup && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between">
          <span className="text-xs text-amber-300">
            Initial setup required &mdash; configure your deployment settings
          </span>
          <button type="button" onClick={onNavigateSetup} className="text-xs text-amber-400 hover:text-amber-200 font-semibold cursor-pointer">
            Go to Setup &rarr;
          </button>
        </div>
      )}

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
        savedTestId={savedTestId}
        isSaving={isSaving}
        onSaveNew={handleSaveNew}
        onUpdate={handleUpdate}
      />

      {/* Clear confirmation */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-navy-900 border border-slate-700 rounded-lg p-6 max-w-sm shadow-xl shadow-black/30 text-center">
            <h3 className="text-base font-bold text-slate-100 mb-2">Clear builder?</h3>
            <p className="text-sm text-slate-400 mb-5">The current test will be reset. Unsaved changes will be lost.</p>
            <div className="flex items-center justify-center gap-3">
              <button type="button" onClick={handleClearCancel} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleClearConfirm} className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
