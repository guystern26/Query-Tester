import React, { useMemo, useState } from 'react';
import type { TestInput, InputMode, EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { Card, Modal } from '../../common';
import { FieldValueEditor } from '../../components/inputs/FieldValueEditor';
import { JsonInputView } from '../../components/inputs/JsonInputView';
import { QueryDataView } from '../../components/inputs/QueryDataView';
import { DataSourceSelector } from './DataSourceSelector';
import { EventGeneratorToggle } from './EventGeneratorToggle';
import { NoEventsIcon, ChevronIcon, MODE_LABELS, INPUT_MODES } from './inputIcons';

export interface InputCardProps {
  testId: EntityId;
  scenarioId: EntityId;
  input: TestInput;
  index?: number;
  isOpen?: boolean;
  onToggle?: () => void;
  accentBorder?: string;
}

function inputHasContent(input: TestInput): boolean {
  if (input.rowIdentifier.trim()) return true;
  if (input.jsonContent.trim()) return true;
  if (input.fileRef) return true;
  if (input.inputMode === 'query_data' && input.queryDataConfig.spl.trim()) return true;
  return input.events.some((e) => e.fieldValues.some((fv) => fv.field.trim() || fv.value.trim()));
}

function InputCardInner({ testId, scenarioId, input, index, isOpen = true, onToggle, accentBorder = '' }: InputCardProps) {
  const setInputMode = useTestStore((s) => s.setInputMode);
  const deleteInput = useTestStore((s) => s.deleteInput);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const num = index ?? 1;

  const setMode = (mode: InputMode) => {
    setInputMode(testId, scenarioId, input.id, mode);
  };

  const fieldCount = input.events.length === 0 ? 0 : Math.max(0, ...input.events.map((e) => e.fieldValues.length));
  const hasNamedFields = input.events.length > 0 && input.events[0].fieldValues.some((fv) => fv.field.trim() !== '');

  const { jsonFieldNames, jsonIsValid } = useMemo(() => {
    if (!input.jsonContent?.trim()) return { jsonFieldNames: [] as string[], jsonIsValid: false };
    try {
      const parsed = JSON.parse(input.jsonContent);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const keys = new Set<string>();
      for (const item of items) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.keys(item).forEach((k) => keys.add(k));
        }
      }
      return { jsonFieldNames: Array.from(keys), jsonIsValid: true };
    } catch { return { jsonFieldNames: [] as string[], jsonIsValid: false }; }
  }, [input.jsonContent]);

  const generatorAvailable = input.inputMode === 'fields' ? hasNamedFields
    : input.inputMode === 'json' ? jsonIsValid
    : false;
  const generatorFieldNames = input.inputMode === 'json' ? jsonFieldNames : undefined;

  const summary = input.rowIdentifier.trim()
    ? input.rowIdentifier.trim()
    : `${input.events.length} event${input.events.length !== 1 ? 's' : ''}, ${fieldCount} field${fieldCount !== 1 ? 's' : ''}`;

  const handleDelete = () => {
    if (inputHasContent(input)) {
      setDeleteOpen(true);
    } else {
      deleteInput(testId, scenarioId, input.id);
    }
  };

  const confirmDelete = () => {
    deleteInput(testId, scenarioId, input.id);
    setDeleteOpen(false);
  };

  const deleteModal = (
    <Modal open={deleteOpen} title="Delete input?" onClose={() => setDeleteOpen(false)} confirmLabel="Delete" onConfirm={confirmDelete} variant="danger">
      <p className="m-0">This input has data. Delete it? This cannot be undone.</p>
    </Modal>
  );

  if (!isOpen) {
    return (
      <>
        <div
          className={`flex items-center gap-3 px-4 py-2.5 bg-navy-800 rounded-lg border border-slate-700 border-l-2 ${accentBorder || 'border-l-slate-700'} cursor-pointer hover:border-slate-600 transition-all duration-200 select-none`}
          onClick={onToggle}
        >
          <ChevronIcon open={false} />
          <span className="font-semibold text-sm text-slate-200">Input {num}</span>
          <span className="text-xs text-slate-500 truncate flex-1">{summary}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-navy-900 px-2 py-0.5 rounded-full shrink-0">
            {MODE_LABELS[input.inputMode]}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="w-6 h-6 rounded-md text-slate-500 flex items-center justify-center hover:bg-red-900/30 hover:text-red-400 transition-all duration-200 cursor-pointer"
            aria-label="Delete input"
          >
            &times;
          </button>
        </div>
        {deleteModal}
      </>
    );
  }

  return (
    <>
      <Card className={accentBorder ? `border-l-2 ${accentBorder}` : ''}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggle}>
            <ChevronIcon open={true} />
            <span className="font-semibold text-[15px] text-slate-100">Input {num}</span>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="w-7 h-7 rounded-md border border-slate-700 text-slate-400 flex items-center justify-center hover:bg-red-900/30 hover:border-red-500 hover:text-red-400 transition-all duration-200 cursor-pointer"
            aria-label="Delete input"
          >
            &times;
          </button>
        </div>

        <DataSourceSelector testId={testId} scenarioId={scenarioId} inputId={input.id} value={input.rowIdentifier} />

        <div className="flex bg-navy-950/80 rounded-xl p-1 border border-slate-700/60 w-fit mb-4 gap-0.5">
          {INPUT_MODES.map(({ key, label, Icon }) => {
            const active = input.inputMode === key;
            return (
              <button
                key={key}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-accent-900 text-accent-300 border border-accent-700/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                }`}
                onClick={() => setMode(key)}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        <div>
          {input.inputMode === 'fields' && (
            <FieldValueEditor testId={testId} scenarioId={scenarioId} inputId={input.id} events={input.events} />
          )}
          {input.inputMode === 'json' && (
            <JsonInputView testId={testId} scenarioId={scenarioId} inputId={input.id} />
          )}
          {input.inputMode === 'query_data' && (
            <QueryDataView testId={testId} scenarioId={scenarioId} inputId={input.id} />
          )}
          {input.inputMode === 'no_events' && (
            <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-navy-800/30 border border-slate-700/40">
              <NoEventsIcon />
              <p className="m-0 text-[13px] text-slate-400">No event data. This input will contribute zero events to the test.</p>
            </div>
          )}

          {input.inputMode !== 'no_events' && input.inputMode !== 'query_data' && (
            <EventGeneratorToggle
              testId={testId}
              scenarioId={scenarioId}
              input={input}
              generatorAvailable={generatorAvailable}
              generatorFieldNames={generatorFieldNames}
            />
          )}
        </div>
      </Card>
      {deleteModal}
    </>
  );
}

export const InputCard = React.memo(InputCardInner);
