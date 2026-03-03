import React from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectInput } from 'core/store/selectors';
import type { EntityId } from 'core/types';
import { MAX_GENERATOR_EVENT_COUNT, MAX_FIELD_CONDITIONS } from 'core/constants/limits';
import { Card, Switch, Button } from '../../common';
import { GeneratorRule } from './GeneratorRule';

export interface GeneratorPanelProps {
  testId: EntityId;
  scenarioId: EntityId;
  inputId: EntityId;
}

export function GeneratorPanel({ testId, scenarioId, inputId }: GeneratorPanelProps) {
  const store = useTestStore();
  const input = selectInput(store, scenarioId, inputId);

  if (!input) return null;

  const cfg = input.generatorConfig;
  const enabled = cfg.enabled;
  const eventCount = cfg.eventCount ?? '';
  const rules = cfg.rules;

  const handleToggle = (checked: boolean) => {
    store.setGeneratorEnabled(testId, scenarioId, inputId, checked);
  };

  const handleEventCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === '') {
      store.updateGeneratorEventCount(testId, scenarioId, inputId, 0);
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    const clamped = Math.min(n, MAX_GENERATOR_EVENT_COUNT);
    store.updateGeneratorEventCount(testId, scenarioId, inputId, clamped);
  };

  const handleAddRule = () => {
    store.addGeneratorRule(testId, scenarioId, inputId, {
      field: '',
      type: 'general_field',
      config: {},
    });
  };

  const canAddRule = rules.length < MAX_FIELD_CONDITIONS;

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--radius-md)',
          marginBottom: 'var(--radius-md)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '0.9375rem',
              margin: 0,
              color: 'var(--text-secondary)',
            }}
          >
            Event generator
          </h3>
        </div>
        <Switch checked={enabled} onChange={handleToggle} label="Enable" />
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}
            >
              Event count
            </label>
            <input
              type="number"
              min={0}
              max={MAX_GENERATOR_EVENT_COUNT}
              value={eventCount}
              onChange={handleEventCountChange}
              placeholder="number of events"
              style={{
                padding: '4px 8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                width: '140px',
              }}
            />
          </div>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddRule}
              disabled={!canAddRule}
            >
              Add Rule
            </Button>
          </div>

          {rules.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)' }}>
              {rules.map((rule) => (
                <GeneratorRule
                  key={rule.id}
                  testId={testId}
                  scenarioId={scenarioId}
                  inputId={inputId}
                  rule={rule}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

