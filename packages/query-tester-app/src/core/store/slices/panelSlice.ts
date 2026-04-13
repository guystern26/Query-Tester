/**
 * Panel slice — view mode (all/single), active panel index, collapsed panels.
 * Persists panelViewMode to localStorage.
 */

export type PanelViewMode = 'all' | 'single';
export type PanelId = 'query' | 'data' | 'validation';

const LS_KEY = 'qt_panel_view_mode';

function loadMode(): PanelViewMode {
    try { const v = localStorage.getItem(LS_KEY); return v === 'single' ? 'single' : 'all'; } catch { return 'all'; }
}

export interface PanelSliceState {
    panelViewMode: PanelViewMode;
    activePanelIndex: number;
    collapsedPanels: Record<PanelId, boolean>;
}

export const panelInitialState: PanelSliceState = {
    panelViewMode: loadMode(),
    activePanelIndex: 0,
    collapsedPanels: { query: false, data: false, validation: false },
};

type SetState = (recipe: (draft: PanelSliceState) => void) => void;

export function panelSlice(set: SetState) {
    return {
        setPanelViewMode: (mode: PanelViewMode) => {
            set((d) => { d.panelViewMode = mode; });
            try { localStorage.setItem(LS_KEY, mode); } catch { /* ignore */ }
        },
        setActivePanelIndex: (index: number) => {
            set((d) => { d.activePanelIndex = index; });
        },
        togglePanelCollapsed: (panel: PanelId) => {
            set((d) => { d.collapsedPanels[panel] = !d.collapsedPanels[panel]; });
        },
    };
}
