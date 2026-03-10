import React, { useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { useTestStore } from 'core/store/testStore';
import { selectInput } from 'core/store/selectors';
import type { EntityId } from 'core/types';
import { TextArea, Message } from '../../common';

export interface JsonInputViewProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
}

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function JsonInputView({ testId, scenarioId, inputId }: JsonInputViewProps) {
  const store = useTestStore();
  const { updateInputJson, setInputFileRef } = store;
  const input = selectInput(store, scenarioId, inputId);
  const storeValue = input?.jsonContent ?? '';
  const fileRef = input?.fileRef ?? null;

  const [value, setValue] = useState(storeValue);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSentValue = useRef(storeValue);

  useEffect(() => {
    // Only sync from store when the value differs from what we last sent
    // (i.e. an external reset happened, not our own debounced write echoing back)
    if (storeValue !== lastSentValue.current) {
      setValue(storeValue);
      lastSentValue.current = storeValue;
      validateJson(storeValue);
    }
  }, [storeValue]);

  const debouncedUpdate = useMemo(
    () => debounce((next: string) => { updateInputJson(testId, scenarioId, inputId, next); }, 300),
    [updateInputJson, testId, scenarioId, inputId]
  );

  useEffect(() => () => { debouncedUpdate.cancel(); }, [debouncedUpdate]);

  const [emptyArrayWarning, setEmptyArrayWarning] = useState(false);

  const validateJson = (text: string) => {
    if (text.trim() === '') { setError(null); setEmptyArrayWarning(false); return; }
    try {
      const parsed = JSON.parse(text);
      setError(null);
      setEmptyArrayWarning(Array.isArray(parsed) && parsed.length === 0);
    } catch { setError('Invalid JSON'); setEmptyArrayWarning(false); }
  };

  const handleChange = (next: string) => {
    setValue(next);
    lastSentValue.current = next;
    validateJson(next);
    debouncedUpdate(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try { JSON.parse(text); } catch { setFileError('Uploaded file does not contain valid JSON.'); e.target.value = ''; return; }
      setFileError(null);
      handleChange(text);
      setInputFileRef(testId, scenarioId, inputId, { name: file.name, size: file.size });
      e.target.value = '';
    };
    reader.onerror = () => { setFileError('Failed to read file.'); e.target.value = ''; };
    reader.readAsText(file);
  };

  const formattedSize = fileRef && typeof fileRef.size === 'number' ? `${(fileRef.size / 1024).toFixed(1)} KB` : null;

  return (
    <div>
      <TextArea value={value} onChange={handleChange} placeholder="Paste your JSON data here..." rows={10} className={`font-mono ${error ? 'border-red-500 focus:border-red-500' : ''}`} />

      {value.trim() !== '' && (
        <div className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${error ? 'text-red-400' : emptyArrayWarning ? 'text-amber-400' : 'text-green-400'}`}>
          {error ? (
            <>
              <AlertIcon />
              <span>{error}</span>
            </>
          ) : emptyArrayWarning ? (
            <>
              <AlertIcon />
              <span>Valid JSON but empty array — no events will be generated</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Valid JSON</span>
            </>
          )}
        </div>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-navy-800 text-slate-200 text-[13px] font-semibold hover:border-accent-600 hover:text-accent-300 transition-all duration-200 cursor-pointer"
        >
          <UploadIcon />
          Upload JSON File
        </button>
        <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileChange} />
      </div>

      {fileRef && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-slate-700/60 text-slate-300 text-[13px]">
          <FileIcon />
          <span>{fileRef.name}{formattedSize ? ` (${formattedSize})` : ''}</span>
          <button
            type="button"
            onClick={() => setInputFileRef(testId, scenarioId, inputId, null)}
            className="p-0.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors duration-200 cursor-pointer"
            aria-label="Clear file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {fileError && (
        <div className="mt-1.5 flex items-center gap-1.5 text-red-400 text-[13px]">
          <AlertIcon />
          <Message type="error">{fileError}</Message>
        </div>
      )}
    </div>
  );
}
