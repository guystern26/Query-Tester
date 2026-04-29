/**
 * Wizard slice — step navigation, query sidebar state.
 * Replaces panelSlice. Persists sidebar state to localStorage.
 */

var LS_COLLAPSED = 'qt_query_sidebar_collapsed';
var LS_WIDTH = 'qt_query_sidebar_width';
var DEFAULT_WIDTH = 280;
var MIN_WIDTH = 180;

function loadCollapsed(): boolean {
    try { return localStorage.getItem(LS_COLLAPSED) === 'true'; } catch { return false; }
}

function loadWidth(): number {
    try {
        var v = parseInt(localStorage.getItem(LS_WIDTH) || '', 10);
        return v >= MIN_WIDTH ? v : DEFAULT_WIDTH;
    } catch { return DEFAULT_WIDTH; }
}

export interface WizardSliceState {
    activeStep: number;
    highestStepReached: number;
    querySidebarCollapsed: boolean;
    querySidebarWidth: number;
    lastExtractedSpl: string;
    confirmedSources: Array<{
        rowIdentifier: string;
        fields: string[];
        colorIndex: number;
    }>;
}

export var wizardInitialState: WizardSliceState = {
    activeStep: 0,
    highestStepReached: 0,
    querySidebarCollapsed: loadCollapsed(),
    querySidebarWidth: loadWidth(),
    lastExtractedSpl: '',
    confirmedSources: [],
};

type SetState = (recipe: (draft: WizardSliceState) => void) => void;

export function wizardSlice(set: SetState) {
    return {
        setActiveStep: function (step: number): void {
            set(function (d) {
                d.activeStep = step;
                if (step > d.highestStepReached) d.highestStepReached = step;
            });
        },
        toggleQuerySidebar: function (): void {
            set(function (d) {
                d.querySidebarCollapsed = !d.querySidebarCollapsed;
            });
            try {
                var current = loadCollapsed();
                localStorage.setItem(LS_COLLAPSED, String(!current));
            } catch { /* ignore */ }
        },
        setQuerySidebarWidth: function (width: number): void {
            var clamped = Math.max(MIN_WIDTH, width);
            set(function (d) { d.querySidebarWidth = clamped; });
            try { localStorage.setItem(LS_WIDTH, String(clamped)); } catch { /* ignore */ }
        },
        setLastExtractedSpl: function (spl: string): void {
            set(function (d) { d.lastExtractedSpl = spl; });
        },
        resetWizard: function (): void {
            set(function (d) {
                d.activeStep = 0;
                d.highestStepReached = 0;
                d.lastExtractedSpl = '';
                d.confirmedSources = [];
            });
        },
        setConfirmedSources: function (sources: Array<{ rowIdentifier: string; fields: string[]; colorIndex: number }>): void {
            set(function (d) { d.confirmedSources = sources; });
        },
        addConfirmedSource: function (rowIdentifier: string, fields: string[]): void {
            set(function (d) {
                for (var i = 0; i < d.confirmedSources.length; i++) {
                    if (d.confirmedSources[i].rowIdentifier.toLowerCase() === rowIdentifier.toLowerCase()) return;
                }
                var nextColor = d.confirmedSources.length;
                d.confirmedSources.push({ rowIdentifier: rowIdentifier, fields: fields, colorIndex: nextColor });
            });
        },
        removeConfirmedSource: function (rowIdentifier: string): void {
            set(function (d) {
                d.confirmedSources = d.confirmedSources.filter(function (s) {
                    return s.rowIdentifier.toLowerCase() !== rowIdentifier.toLowerCase();
                });
            });
        },
        clearConfirmedSources: function (): void {
            set(function (d) { d.confirmedSources = []; });
        },
    };
}
