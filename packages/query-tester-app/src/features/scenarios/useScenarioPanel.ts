/**
 * Custom hook for ScenarioPanel — manages selected scenario, open input,
 * and auto-selection behavior extracted from 5 useEffect hooks.
 */
import { useState, useEffect, useRef } from 'react';
import type { Scenario } from 'core/types';

interface UseScenarioPanelResult {
    selId: string | null;
    setSelId: (id: string | null) => void;
    openInputId: string | null;
    setOpenInputId: (id: string | null) => void;
}

export function useScenarioPanel(scenarios: Scenario[]): UseScenarioPanelResult {
    const [selId, setSelId] = useState<string | null>(null);
    const [openInputId, setOpenInputId] = useState<string | null>(null);
    const prevLen = useRef(scenarios.length);
    const prevInputLen = useRef(0);

    // Ensure selId stays in sync with available scenarios
    useEffect(() => {
        if (!scenarios.length) { setSelId(null); return; }
        if (selId && scenarios.some((s) => s.id === selId)) return;
        setSelId(scenarios[0].id);
    }, [scenarios, selId]);

    // Auto-select newly added scenario
    useEffect(() => {
        if (scenarios.length > prevLen.current) {
            setSelId(scenarios[scenarios.length - 1].id);
        }
        prevLen.current = scenarios.length;
    }, [scenarios]);

    const sel = scenarios.find((s) => s.id === selId);

    // Auto-open first input when switching scenarios, or newly added input
    useEffect(() => {
        if (!sel) { setOpenInputId(null); return; }
        const inputs = sel.inputs;
        if (inputs.length > prevInputLen.current) {
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

    return { selId, setSelId, openInputId, setOpenInputId };
}
