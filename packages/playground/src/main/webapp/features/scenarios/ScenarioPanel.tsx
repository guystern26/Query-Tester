import React, { useState, useEffect } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_SCENARIOS_PER_TEST, MAX_INPUTS_PER_SCENARIO } from 'core/constants/limits';
import type { Scenario } from 'core/types';
import { Tabs, TextArea, Button, Modal } from '../../common';
import { InputCard } from './InputCard';

function scenarioHasInputsWithData(scenario: Scenario): boolean {
  return scenario.inputs.some((input) => {
    if (input.rowIdentifier.trim() !== '') return true;
    if (input.jsonContent.trim() !== '') return true;
    if (input.fileRef) return true;
    return input.events.some((e) =>
      e.fieldValues.some((fv) => fv.field.trim() !== '' || fv.value.trim() !== '')
    );
  });
}

export function ScenarioPanel() {
  const state = useTestStore();
  const activeTest = selectActiveTest(state);
  const scenarios = activeTest?.scenarios ?? [];

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);

  // When scenarios grow, select the last (newly added)
  useEffect(() => {
    if (scenarios.length > 0 && selectedScenarioId === null) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios.length, selectedScenarioId]);

  useEffect(() => {
    if (scenarios.length > 0 && selectedScenarioId !== null) {
      const exists = scenarios.some((s) => s.id === selectedScenarioId);
      if (!exists) setSelectedScenarioId(scenarios[0].id);
    } else if (scenarios.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(scenarios[0].id);
    } else if (scenarios.length === 0) {
      setSelectedScenarioId(null);
    }
  }, [scenarios, selectedScenarioId]);

  // When we add a scenario, select the new one (last in list)
  const prevLengthRef = React.useRef(scenarios.length);
  useEffect(() => {
    if (scenarios.length > prevLengthRef.current) {
      setSelectedScenarioId(scenarios[scenarios.length - 1].id);
    }
    prevLengthRef.current = scenarios.length;
  }, [scenarios.length, scenarios]);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);
  const canAddScenario = activeTest && scenarios.length < MAX_SCENARIOS_PER_TEST;
  const canAddInput =
    activeTest && selectedScenario && selectedScenario.inputs.length < MAX_INPUTS_PER_SCENARIO;

  const tabs = scenarios.map((s) => ({
    id: s.id,
    label: s.name.trim() || 'Unnamed',
  }));

  const handleAddScenario = () => {
    if (activeTest && canAddScenario) state.addScenario(activeTest.id);
  };

  const handleRemoveTab = (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario || !activeTest) return;
    if (scenarioHasInputsWithData(scenario)) {
      setScenarioToDelete(scenarioId);
      setDeleteModalOpen(true);
    } else {
      state.deleteScenario(activeTest.id, scenarioId);
      if (selectedScenarioId === scenarioId) {
        const idx = scenarios.findIndex((s) => s.id === scenarioId);
        const next = scenarios[idx === 0 ? 1 : idx - 1];
        setSelectedScenarioId(next?.id ?? null);
      }
    }
  };

  const confirmDelete = () => {
    if (activeTest && scenarioToDelete) {
      state.deleteScenario(activeTest.id, scenarioToDelete);
      if (selectedScenarioId === scenarioToDelete) {
        const scenariosAfter = activeTest.scenarios.filter((s) => s.id !== scenarioToDelete);
        const idx = activeTest.scenarios.findIndex((s) => s.id === scenarioToDelete);
        const next = scenariosAfter[idx === 0 ? 0 : idx - 1];
        setSelectedScenarioId(next?.id ?? null);
      }
      setScenarioToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const handleScenarioNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeTest && selectedScenario) {
      state.updateScenarioName(activeTest.id, selectedScenario.id, e.target.value);
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (activeTest && selectedScenario) {
      state.updateScenarioDescription(activeTest.id, selectedScenario.id, value);
    }
  };

  const handleAddInput = () => {
    if (activeTest && selectedScenario && canAddInput) {
      state.addInput(activeTest.id, selectedScenario.id);
    }
  };

  if (!activeTest) return null;

  return (
    <>
      <div
        style={{
          padding: 'var(--radius-lg)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Tabs
          tabs={tabs}
          activeId={selectedScenarioId ?? ''}
          onChange={(id) => setSelectedScenarioId(id)}
          onRemove={scenarios.length > 1 ? handleRemoveTab : undefined}
          onAdd={handleAddScenario}
        />

        {selectedScenario && (
          <>
            <div style={{ marginBottom: 'var(--radius-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Scenario name
              </label>
              <input
                type="text"
                value={selectedScenario.name}
                onChange={handleScenarioNameChange}
                placeholder="e.g., Normal user activity, Brute force attack..."
                style={{
                  padding: 'var(--radius-sm) var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  width: '100%',
                  maxWidth: 320,
                }}
              />
            </div>
            <div style={{ marginBottom: 'var(--radius-lg)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Scenario description
              </label>
              <TextArea
                value={selectedScenario.description}
                onChange={handleDescriptionChange}
                placeholder="Describe what this scenario tests..."
                rows={3}
              />
            </div>

            <div style={{ marginBottom: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '0.9375rem', marginBottom: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                Inputs
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--radius-md)', marginBottom: 'var(--radius-lg)' }}>
              {selectedScenario.inputs.map((input, i) => (
                <InputCard
                  key={input.id}
                  testId={activeTest.id}
                  scenarioId={selectedScenario.id}
                  input={input}
                  index={i + 1}
                />
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddInput}
              disabled={!canAddInput}
            >
              Add Input
            </Button>
          </>
        )}
      </div>

      <Modal
        open={deleteModalOpen}
        title="Delete scenario?"
        onClose={() => { setDeleteModalOpen(false); setScenarioToDelete(null); }}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="danger"
      >
        <p style={{ margin: 0 }}>
          Delete &quot;
          {scenarios.find((s) => s.id === scenarioToDelete)?.name || 'this scenario'}
          &quot;? This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
