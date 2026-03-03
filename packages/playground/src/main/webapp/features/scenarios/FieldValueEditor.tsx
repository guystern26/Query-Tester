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

const inputStyle: React.CSSProperties = {
  padding: 'var(--radius-sm) var(--radius-md)',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  width: '100%',
  minWidth: 0,
};

export function FieldValueEditor({ testId, scenarioId, inputId, events }: FieldValueEditorProps) {
  const state = useTestStore();
  const maxFields = Math.max(0, ...events.map((e) => e.fieldValues.length));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--radius-md)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={() => state.addFieldToAllEvents(testId, scenarioId, inputId)}>
          Add field to all events
        </Button>
        <Button variant="secondary" size="sm" onClick={() => state.addEvent(testId, scenarioId, inputId)}>
          Add event
        </Button>
      </div>

      {events.map((event, eventIndex) => (
        <div
          key={event.id}
          style={{
            padding: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Event {eventIndex + 1}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => state.deleteEvent(testId, scenarioId, inputId, event.id)}
            >
              Remove event
            </Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-sm)' }}>
            {event.fieldValues.map((fv, fieldIndex) => (
              <div key={fv.id} style={{ display: 'flex', gap: 'var(--radius-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={fv.field}
                  onChange={(e) =>
                    state.updateFieldValue(testId, scenarioId, inputId, event.id, fv.id, { field: e.target.value })
                  }
                  placeholder="field name"
                  style={{ ...inputStyle, flex: '1 1 120px', maxWidth: 200 }}
                />
                <input
                  type="text"
                  value={fv.value}
                  onChange={(e) =>
                    state.updateFieldValue(testId, scenarioId, inputId, event.id, fv.id, { value: e.target.value })
                  }
                  placeholder="value"
                  style={{ ...inputStyle, flex: '2 1 160px' }}
                />
                <button
                  type="button"
                  onClick={() => state.removeFieldFromAllEvents(testId, scenarioId, inputId, fieldIndex)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.875rem',
                  }}
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
