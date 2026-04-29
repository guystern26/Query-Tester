import React, { useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { MAX_SCENARIOS_PER_TEST, MAX_INPUTS_PER_SCENARIO } from 'core/constants/limits';
import { Button, Modal } from '../../common';
import { InputCard } from './InputCard';
import { ScenarioTabRow, hasData } from './ScenarioTabRow';
import { getScenarioColor } from './scenarioColors';
import { useScenarioPanel } from './useScenarioPanel';
import { InjectionPreview } from './InjectionPreview';

export function ScenarioPanel() {
    const test = useTestStore(selectActiveTest);
    const deleteScenario = useTestStore((s) => s.deleteScenario);
    const addScenario = useTestStore((s) => s.addScenario);
    const updateScenarioName = useTestStore((s) => s.updateScenarioName);
    const updateScenarioDescription = useTestStore((s) => s.updateScenarioDescription);
    const addInput = useTestStore((s) => s.addInput);
    const scenarios = test?.scenarios ?? [];

    const { selId, setSelId, openInputId, setOpenInputId } = useScenarioPanel(scenarios);
    const [delModal, setDelModal] = useState(false);
    const [delTarget, setDelTarget] = useState<string | null>(null);

    if (!test) return null;

    const sel = scenarios.find((s) => s.id === selId);
    const canAddScenario = scenarios.length < MAX_SCENARIOS_PER_TEST;
    const canAddInput = sel ? sel.inputs.length < MAX_INPUTS_PER_SCENARIO : false;

    const handleRemoveTab = (id: string) => {
        const sc = scenarios.find((s) => s.id === id);
        if (!sc) return;
        if (hasData(sc)) { setDelTarget(id); setDelModal(true); return; }
        doDelete(id);
    };

    const doDelete = (id: string) => {
        deleteScenario(test.id, id);
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
    const selColor = getScenarioColor(Math.max(0, scenarios.findIndex((s) => s.id === selId)));

    return (
        <>
            <ScenarioTabRow
                scenarios={scenarios}
                selectedId={selId}
                onSelect={setSelId}
                onRemove={handleRemoveTab}
                canAdd={canAddScenario}
                onAdd={() => addScenario(test.id)}
            />

            {sel && (
                <>
                    <div className="flex gap-3 items-center">
                        <input
                            type="text"
                            value={sel.name}
                            onChange={(e) => updateScenarioName(test.id, sel.id, e.target.value)}
                            maxLength={80}
                            placeholder="Scenario name..."
                            className="flex-1 min-w-0 bg-transparent border-0 border-b border-slate-700 rounded-none px-0 py-0.5 text-[12px] font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-300 transition-colors duration-200"
                        />
                        <input
                            type="text"
                            value={sel.description}
                            onChange={(e) => updateScenarioDescription(test.id, sel.id, e.target.value)}
                            maxLength={200}
                            placeholder="Description..."
                            className="flex-[2] min-w-0 bg-transparent border-0 border-b border-slate-700 rounded-none px-0 py-0.5 text-[12px] text-slate-400 placeholder-slate-500 focus:outline-none focus:border-blue-300 focus:text-slate-200 transition-colors duration-200"
                        />
                    </div>

                    {sel.inputs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="flex items-center gap-3 mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300 shrink-0" style={{ animation: 'sidebarPointLeft 2s ease-in-out infinite' }}>
                                    <path d="M19 12H5" />
                                    <path d="M12 19l-7-7 7-7" />
                                </svg>
                                <p className="text-sm text-blue-300 font-medium">Click a highlighted source in the sidebar</p>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">Sources are highlighted in your query on the left. Click one to add it as a data input.</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>or</span>
                                <button className="text-blue-300 hover:text-blue-200 underline underline-offset-2 cursor-pointer transition-colors" onClick={() => addInput(test.id, sel.id)}>add an input manually</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center mt-3 mb-1">
                                <button
                                    className="px-5 py-1.5 rounded-lg border border-dashed border-slate-600 text-[12px] font-medium text-slate-400 hover:text-blue-300 hover:border-blue-300/40 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => addInput(test.id, sel.id)}
                                    disabled={!canAddInput}
                                >
                                    + Add Input
                                </button>
                            </div>
                            <div className="flex flex-col gap-3 mt-1">
                                {sel.inputs.map((inp, i) => (
                                    <InputCard
                                        key={inp.id}
                                        testId={test.id}
                                        scenarioId={sel.id}
                                        input={inp}
                                        index={i + 1}
                                        isOpen={openInputId === inp.id}
                                        onToggle={() => setOpenInputId(openInputId === inp.id ? null : inp.id)}
                                        accentBorder={selColor.cardBorder}
                                    />
                                ))}
                            </div>
                            <InjectionPreview scenarioId={sel.id} />
                            <button
                                className="w-full py-2.5 mt-3 border border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:text-blue-300 hover:border-blue-300 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => addInput(test.id, sel.id)}
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
