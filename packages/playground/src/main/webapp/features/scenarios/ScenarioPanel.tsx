import React, { useState, useEffect, useRef } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_SCENARIOS_PER_TEST, MAX_INPUTS_PER_SCENARIO } from 'core/constants/limits';
import type { Scenario } from 'core/types';
import { Button, Modal } from '../../common';
import { InputCard } from './InputCard';

function hasData(s: Scenario): boolean {
  return s.inputs.some((inp) => {
    if (inp.rowIdentifier.trim()) return true;
    if (inp.jsonContent.trim()) return true;
    if (inp.fileRef) return true;
    return inp.events.some((e) => e.fieldValues.some((fv) => fv.field.trim() || fv.value.trim()));
  });
}

export function ScenarioPanel() {
  const state = useTestStore();
  const test = selectActiveTest(state);
  const scenarios = test?.scenarios ?? [];

  const [selId, setSelId] = useState<string | null>(null);
  const [openInputId, setOpenInputId] = useState<string | null>(null);
  const [delModal, setDelModal] = useState(false);
  const [delTarget, setDelTarget] = useState<string | null>(null);
  const prevLen = useRef(scenarios.length);
  const prevInputLen = useRef(0);

  useEffect(() => {
    if (!scenarios.length) { setSelId(null); return; }
    if (selId && scenarios.some((s) => s.id === selId)) return;
    setSelId(scenarios[0].id);
  }, [scenarios, selId]);

  useEffect(() => {
    if (scenarios.length > prevLen.current) setSelId(scenarios[scenarios.length - 1].id);
    prevLen.current = scenarios.length;
  }, [scenarios]);

  const sel = scenarios.find((s) => s.id === selId);

  // Auto-open first input when switching scenarios, or newly added input
  useEffect(() => {
    if (!sel) { setOpenInputId(null); return; }
    const inputs = sel.inputs;
    if (inputs.length > prevInputLen.current) {
      // New input added — open it
      setOpenInputId(inputs[inputs.length - 1].id);
    } else if (inputs.length === 1) {
      setOpenInputId(inputs[0].id);
    }
    prevInputLen.current = inputs.length;
  }, [sel?.inputs.length]);

  // Reset open input when scenario changes
  useEffect(() => {
    if (!sel) return;
    const inputs = sel.inputs;
    setOpenInputId(inputs.length === 1 ? inputs[0].id : null);
    prevInputLen.current = inputs.length;
  }, [selId]);

  if (!test) return null;

  const canAddScenario = scenarios.length < MAX_SCENARIOS_PER_TEST;
  const canAddInput = sel ? sel.inputs.length < MAX_INPUTS_PER_SCENARIO : false;

  const handleRemoveTab = (id: string) => {
    const sc = scenarios.find((s) => s.id === id);
    if (!sc) return;
    if (hasData(sc)) { setDelTarget(id); setDelModal(true); return; }
    doDelete(id);
  };

  const doDelete = (id: string) => {
    state.deleteScenario(test.id, id);
    if (selId === id) {
      const idx = scenarios.findIndex((s) => s.id === id);
      const rest = scenarios.filter((s) => s.id !== id);
      setSelId(rest[idx === 0 ? 0 : idx - 1]?.id ?? null);
    }
  };

  const confirmDelete = () => {
    if (delTarget) doDelete(delTarget);
    setDelTarget(null);
    setDelModal(false);
  };

  const delName = scenarios.find((s) => s.id === delTarget)?.name?.trim() || 'this scenario';

  return (
    <>
      {/* Tab row */}
      <div className="flex items-center border-b border-slate-800 mb-4">
        {scenarios.map((s, i) => (
          <div key={s.id} className="relative group">
            <button
              className={`px-4 py-2 text-[13px] -mb-px border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                s.id === selId
                  ? 'font-semibold text-cyan-400 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800'
              }`}
              onClick={() => setSelId(s.id)}
            >
              {s.name.trim() || `Scenario ${i + 1}`}
              {hasData(s) && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
            </button>
            {scenarios.length > 1 && (
              <button
                className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full text-[11px] text-slate-500 hover:text-red-400 hover:bg-red-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                onClick={() => handleRemoveTab(s.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-sm ml-2 -mb-px flex items-center justify-center hover:text-cyan-400 hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => state.addScenario(test.id)}
          disabled={!canAddScenario}
        >
          +
        </button>
      </div>

      {sel && (
        <>
          <input
            type="text"
            value={sel.name}
            onChange={(e) => state.updateScenarioName(test.id, sel.id, e.target.value)}
            placeholder="e.g., Normal user activity..."
            className="w-full bg-transparent border-0 border-b border-slate-700 rounded-none px-0 py-1.5 text-[13px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition mb-1"
          />
          <input
            type="text"
            value={sel.description}
            onChange={(e) => state.updateScenarioDescription(test.id, sel.id, e.target.value)}
            placeholder="Describe this scenario..."
            className="w-full bg-transparent border-0 border-b border-slate-700 rounded-none px-0 py-1.5 text-[13px] text-slate-400 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:text-slate-200 transition"
          />

          {sel.inputs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mb-3">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <p className="text-sm text-slate-400 mb-1">No inputs yet</p>
              <p className="text-xs text-slate-500 mb-4">Add your first input to define test data</p>
              <Button variant="primary" size="sm" onClick={() => state.addInput(test.id, sel.id)}>+ Add Input</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 mt-3">
                {sel.inputs.map((inp, i) => (
                  <InputCard
                    key={inp.id}
                    testId={test.id}
                    scenarioId={sel.id}
                    input={inp}
                    index={i + 1}
                    isOpen={openInputId === inp.id}
                    onToggle={() => setOpenInputId(openInputId === inp.id ? null : inp.id)}
                  />
                ))}
              </div>
              <button
                className="w-full py-2.5 mt-3 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => state.addInput(test.id, sel.id)}
                disabled={!canAddInput}
              >
                + Add another input
              </button>
            </>
          )}
        </>
      )}

      <Modal open={delModal} title="Delete scenario?" onClose={() => { setDelModal(false); setDelTarget(null); }} confirmLabel="Delete" onConfirm={confirmDelete} variant="danger">
        <p className="m-0">Delete &quot;{delName}&quot;? All inputs and events will be lost.</p>
      </Modal>
    </>
  );
}
