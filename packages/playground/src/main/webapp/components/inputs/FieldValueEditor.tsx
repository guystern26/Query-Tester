import React from 'react';
import { useTestStore } from 'core/store/testStore';
import type { EntityId, InputEvent } from 'core/types';
import { MAX_EVENTS_PER_INPUT, MAX_FIELDS_PER_EVENT } from 'core/constants/limits';
import { Button } from '../../common';

export interface FieldValueEditorProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
  events: InputEvent[];
}

const nameInputStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '0.8125rem',
  width: '100%',
  boxSizing: 'border-box',
};

const valueInputStyle: React.CSSProperties = {
  ...nameInputStyle,
};

export function FieldValueEditor({
  testId,
  scenarioId,
  inputId,
  events,
}: FieldValueEditorProps) {
  const state = useTestStore();

  const eventCount = events.length;
  const fieldCount =
    events.length === 0 ? 0 : Math.max(0, ...events.map((e) => e.fieldValues.length));

  const canAddEvent = eventCount < MAX_EVENTS_PER_INPUT;
  const canAddField = fieldCount < MAX_FIELDS_PER_EVENT;

  const handleAddEvent = () => {
    if (!canAddEvent) return;
    state.addEvent(testId, scenarioId, inputId);
  };

  const handleAddField = () => {
    if (!canAddField) return;
    state.addFieldToAllEvents(testId, scenarioId, inputId);
  };

  const handleRemoveFieldRow = (fieldIndex: number) => {
    state.removeFieldFromAllEvents(testId, scenarioId, inputId, fieldIndex);
  };

  const handleRemoveEvent = (eventId: EntityId) => {
    state.deleteEvent(testId, scenarioId, inputId, eventId);
  };

  const handleFieldNameChange = (fieldIndex: number, value: string) => {
    // update the field name for this row across all events
    for (const evt of events) {
      const fv = evt.fieldValues[fieldIndex];
      if (fv) {
        state.updateFieldValue(
          testId,
          scenarioId,
          inputId,
          evt.id,
          fv.id,
          { field: value }
        );
      }
    }
  };

  const handleFieldValueChange = (
    eventId: EntityId,
    fieldIndex: number,
    value: string
  ) => {
    const evt = events.find((e) => e.id === eventId);
    if (!evt) return;
    const fv = evt.fieldValues[fieldIndex];
    if (!fv) return;
    state.updateFieldValue(testId, scenarioId, inputId, eventId, fv.id, { value });
  };

  if (events.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Add your first event to start defining test data.
        </p>
        <Button variant="secondary" size="sm" onClick={handleAddEvent} disabled={!canAddEvent}>
          + Add Event
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 8px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                Field
              </th>
              {events.map((evt, idx) => (
                <th
                  key={evt.id}
                  style={{
                    textAlign: 'left',
                    padding: '4px 8px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>Event {idx + 1}</span>
                  <span style={{ marginLeft: 4 }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRemoveEvent(evt.id)}
                      disabled={eventCount <= 1}
                    >
                      ×
                    </Button>
                  </span>
                </th>
              ))}
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 8px',
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddEvent}
                  disabled={!canAddEvent}
                >
                  + Event
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: fieldCount }).map((_, fieldIndex) => {
              const firstWithField: InputEvent | undefined = events.find(
                (e) => e.fieldValues[fieldIndex]
              );
              const fieldName =
                firstWithField?.fieldValues[fieldIndex].field ?? '';

              return (
                <tr key={fieldIndex}>
                  <td
                    style={{
                      padding: '4px 8px',
                      verticalAlign: 'top',
                      minWidth: 140,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={fieldName}
                        onChange={(e) =>
                          handleFieldNameChange(fieldIndex, e.target.value)
                        }
                        placeholder="field name"
                        style={nameInputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFieldRow(fieldIndex)}
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
                  </td>
                  {events.map((evt) => {
                    const fv = evt.fieldValues[fieldIndex];
                    const value = fv?.value ?? '';
                    return (
                      <td
                        key={evt.id}
                        style={{
                          padding: '4px 8px',
                          verticalAlign: 'top',
                          minWidth: 160,
                        }}
                      >
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            handleFieldValueChange(evt.id, fieldIndex, e.target.value)
                          }
                          placeholder="value"
                          style={valueInputStyle}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <td
                style={{
                  padding: '4px 8px',
                  verticalAlign: 'top',
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddField}
                  disabled={!canAddField}
                >
                  + Field
                </Button>
              </td>
              {events.map((evt) => (
                <td key={evt.id} />
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

