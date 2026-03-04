import React, { useCallback, useRef } from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, InputEvent } from 'core/types';
import { MAX_EVENTS_PER_INPUT, MAX_FIELDS_PER_EVENT } from 'core/constants/limits';

export interface FieldValueEditorProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  events: InputEvent[];
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function FieldValueEditor({ testId, scenarioId, inputId, events }: FieldValueEditorProps) {
  const store = useTestStore();
  const fieldCount = events.length === 0
    ? 0
    : Math.max(0, ...events.map((e) => e.fieldValues.length));
  const canAddEvent = events.length < MAX_EVENTS_PER_INPUT;
  const canAddField = fieldCount < MAX_FIELDS_PER_EVENT;

  const addEvent = () => canAddEvent && store.addEvent(testId, scenarioId, inputId);
  const addField = () => canAddField && store.addFieldToAllEvents(testId, scenarioId, inputId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-10">
        <p className="text-sm text-slate-500 m-0">Click + Add Event to start defining test data</p>
        <button
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-accent-300 transition-colors duration-200 cursor-pointer"
          onClick={addEvent}
          disabled={!canAddEvent}
        >
          <PlusIcon /> Add Event
        </button>
      </div>
    );
  }

  const fieldNames: string[] = [];
  for (let fi = 0; fi < fieldCount; fi++) {
    fieldNames.push(events[0]?.fieldValues[fi]?.field ?? '');
  }

  return (
    <div>
      <div ref={scrollRef} onWheel={handleWheel} className="overflow-x-auto rounded-xl border border-slate-600/50 bg-navy-900/40">
        <table className="border-collapse text-sm">
          {/* Header: corner, then Event 1 / Event 2 / …, then + Event */}
          <thead>
            <tr className="bg-navy-900/90">
              <th className="min-w-[160px] sticky left-0 z-20 bg-navy-900 border-b border-slate-600/60" />
              {events.map((evt, ei) => (
                <th key={evt.id} className="border-b border-slate-600/60 px-1.5 py-2.5">
                  <div className="flex items-center justify-center gap-1">
                    {events.length > 1 && (
                      <button
                        className="p-0.5 text-slate-700 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors duration-200 cursor-pointer flex-shrink-0"
                        onClick={() => store.deleteEvent(testId, scenarioId, inputId, evt.id)}
                        aria-label={`Delete event ${ei + 1}`}
                      >
                        <XIcon size={12} />
                      </button>
                    )}
                    <span className="text-xs uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">
                      Event {ei + 1}
                    </span>
                  </div>
                </th>
              ))}
              <th className="border-b border-slate-600/60 px-3 w-full text-left">
                <button
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-accent-300 transition-colors duration-200 cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={addEvent}
                  disabled={!canAddEvent}
                  title="Add event column"
                >
                  <PlusIcon /> Event
                </button>
              </th>
            </tr>
          </thead>

          {/* Rows = fields */}
          <tbody>
            {Array.from({ length: fieldCount }).map((_, fi) => {
              const fieldName = fieldNames[fi];
              return (
                <tr
                  key={fi}
                  className={`group border-b border-slate-700/30 transition-colors duration-200 ${
                    fi % 2 === 1 ? 'bg-navy-800/15' : ''
                  } hover:bg-navy-700/20`}
                >
                  {/* Field name (sticky left) with X to the left */}
                  <td className="min-w-[160px] py-1.5 sticky left-0 z-10 bg-navy-800 border-r border-slate-700/40">
                    <div className="flex items-center gap-0.5 px-1.5">
                      <button
                        className="p-0.5 text-slate-700 hover:text-red-400 hover:bg-red-900/20 rounded transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0"
                        onClick={() => store.removeFieldFromAllEvents(testId, scenarioId, inputId, fi)}
                        aria-label={`Delete field ${fieldName || fi + 1}`}
                      >
                        <XIcon size={12} />
                      </button>
                      <input
                        className="w-28 px-2 py-1.5 text-sm font-semibold bg-transparent border-0 border-b-2 border-accent-700/50 text-accent-300 placeholder-slate-600 focus:outline-none focus:border-accent-600 transition-colors duration-200"
                        type="text"
                        value={fieldName}
                        onChange={(e) =>
                          store.updateFieldNameInAllEvents(testId, scenarioId, inputId, fi, e.target.value)
                        }
                        placeholder="field name"
                      />
                    </div>
                  </td>
                  {/* Values per event */}
                  {events.map((evt) => {
                    const fv = evt.fieldValues[fi];
                    return (
                      <td key={evt.id} className="px-1.5 py-1.5">
                        <input
                          className="w-36 px-2.5 py-2 text-sm bg-navy-800/30 border border-slate-700/40 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-600 focus:bg-navy-800/50 transition-all duration-200"
                          type="text"
                          value={fv?.value ?? ''}
                          onChange={(e) =>
                            fv &&
                            store.updateFieldValue(testId, scenarioId, inputId, evt.id, fv.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="value"
                        />
                      </td>
                    );
                  })}
                  <td />
                </tr>
              );
            })}
            {/* + Add Field row */}
            <tr>
              <td className="py-2 px-2 sticky left-0 z-10 bg-navy-800">
                <button
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-accent-300 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={addField}
                  disabled={!canAddField}
                >
                  <PlusIcon /> Field
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Counts */}
      <div className="flex items-center justify-end mt-1.5 px-1">
        <span className="text-xs text-slate-600">
          {fieldCount}/{MAX_FIELDS_PER_EVENT} fields &middot; {events.length}/{MAX_EVENTS_PER_INPUT} events
        </span>
      </div>
    </div>
  );
}
