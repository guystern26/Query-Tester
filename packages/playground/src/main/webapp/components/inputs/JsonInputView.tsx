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

  // Sync from store when external value changes
  useEffect(() => {
    setValue(storeValue);
    setError(null);
    setFileError(null);
  }, [storeValue]);

  const debouncedUpdate = useMemo(
    () =>
      debounce((next: string) => {
        updateInputJson(testId, scenarioId, inputId, next);
      }, 300),
    [updateInputJson, testId, scenarioId, inputId]
  );

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleChange = (next: string) => {
    setValue(next);
    if (next.trim() === '') {
      setError(null);
    } else {
      try {
        JSON.parse(next);
        setError(null);
      } catch {
        setError('Invalid JSON');
      }
    }
    debouncedUpdate(next);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      try {
        JSON.parse(text);
      } catch {
        setFileError('Uploaded file does not contain valid JSON.');
        e.target.value = '';
        return;
      }
      setFileError(null);
      handleChange(text);
      // store metadata only
      setInputFileRef(
        testId,
        scenarioId,
        inputId,
        {
          name: file.name,
          size: file.size,
        } as any
      );
      e.target.value = '';
    };
    reader.onerror = () => {
      setFileError('Failed to read file.');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setInputFileRef(testId, scenarioId, inputId, null);
  };

  const formattedSize =
    fileRef && typeof fileRef.size === 'number'
      ? `${(fileRef.size / 1024).toFixed(1)} KB`
      : null;

  return (
    <div>
      <TextArea
        value={value}
        onChange={handleChange}
        placeholder="Paste your JSON data here..."
        rows={8}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          borderColor: error ? 'var(--error)' : undefined,
        }}
      />
      {error && (
        <div style={{ marginTop: '4px' }}>
          <Message type="error">{error}</Message>
        </div>
      )}

      <div style={{ marginTop: 'var(--radius-md)' }}>
        <ButtonRow onClick={handleUploadClick} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {fileRef && (
        <div
          style={{
            marginTop: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
          }}
        >
          <span>
            Loaded: {fileRef.name}
            {formattedSize ? ` (${formattedSize})` : ''}
          </span>
          <button
            type="button"
            onClick={handleClearFile}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.875rem',
            }}
            aria-label="Clear file"
          >
            ×
          </button>
        </div>
      )}

      {fileError && (
        <div style={{ marginTop: '4px' }}>
          <Message type="error">{fileError}</Message>
        </div>
      )}
    </div>
  );
}

interface ButtonRowProps {
  onClick: () => void;
}

function ButtonRow({ onClick }: ButtonRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
    >
      Upload JSON File
    </button>
  );
}

