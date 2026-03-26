import React from 'react';
import type { EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { Button } from '../../common';

export interface FieldValueEditorProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  events: Array<{ id: EntityId; fieldValues: Array<{ id: EntityId; field: string; value: string }> }>;
}

export function FieldValueEditor({ testId, scenarioId, inputId, events }: FieldValueEditorProps) {
  const addFieldToAllEvents = useTestStore((s) => s.addFieldToAllEvents);
  const addEvent = useTestStore((s) => s.addEvent);
  const deleteEvent = useTestStore((s) => s.deleteEvent);
  const updateFieldValue = useTestStore((s) => s.updateFieldValue);
  const removeFieldFromAllEvents = useTestStore((s) => s.removeFieldFromAllEvents);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-center flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => addFieldToAllEvents(testId, scenarioId, inputId)}>
          Add field to all events
        </Button>
        <Button variant="secondary" size="sm" onClick={() => addEvent(testId, scenarioId, inputId)}>
          Add event
        </Button>
      </div>

      {events.map((event, eventIndex) => (
        <div key={event.id} className="p-2 bg-navy-800 border border-slate-700 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[13px] font-semibold text-slate-400">
              Event {eventIndex + 1}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteEvent(testId, scenarioId, inputId, event.id)}
            >
              Remove event
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            {event.fieldValues.map((fv, fieldIndex) => (
              <div key={fv.id} className="flex gap-1 items-center flex-wrap">
                <input
                  type="text"
                  value={fv.field}
                  onChange={(e) =>
                    updateFieldValue(testId, scenarioId, inputId, event.id, fv.id, { field: e.target.value })
                  }
                  placeholder="field name"
                  className="px-2 py-1.5 text-sm w-full min-w-0"
                  style={{ flex: '1 1 120px', maxWidth: 200 }}
                />
                <input
                  type="text"
                  value={fv.value}
                  onChange={(e) =>
                    updateFieldValue(testId, scenarioId, inputId, event.id, fv.id, { value: e.target.value })
                  }
                  placeholder="value"
                  className="px-2 py-1.5 text-sm w-full min-w-0"
                  style={{ flex: '2 1 160px' }}
                />
                <button
                  type="button"
                  onClick={() => removeFieldFromAllEvents(testId, scenarioId, inputId, fieldIndex)}
                  className="border-none bg-transparent text-slate-400 cursor-pointer px-1 py-0.5 text-sm rounded"
                  aria-label="Remove this field from all events"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
