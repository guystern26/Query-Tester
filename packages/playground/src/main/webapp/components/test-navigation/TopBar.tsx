import React, { useRef } from 'react';
import { useTestStore } from 'core/store/testStore';
import { Button } from '../../common';
import { TestNavigation } from './TestNavigation';
import { BugReportButton } from './BugReportButton';

export function TopBar() {
  const state = useTestStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="sticky top-0 z-50 h-14 bg-slate-900 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleSave}>Save</Button>
        <Button variant="secondary" size="sm" onClick={handleLoadClick}>Load</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <BugReportButton />
      </div>
      <TestNavigation />
    </header>
  );
}
