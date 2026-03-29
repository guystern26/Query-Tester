/**
 * IDE slice: state and actions for the SPL IDE run + analysis flow.
 * Keeps IDE concerns separate from the test runner (runSlice).
 */

import type { IdeRunResponse, AnalysisNote } from '../../../api/ideApi';
import { runIdeQuery, analyzeSpl } from '../../../api/ideApi';

export interface IdeSliceState {
    ideResponse: IdeRunResponse | null;
    ideRunning: boolean;
    analysisNotes: AnalysisNote[];
    analysisLoading: boolean;
    ideUserContext: string;
    runIdeQuery: (spl: string, app: string, timeRange?: { earliest: string; latest: string }, userContext?: string, priorAnalysis?: Array<{ severity: string; category: string; message: string }>, allowBlocked?: boolean) => Promise<void>;
    cancelIdeRun: () => void;
    clearIdeResults: () => void;
    setIdeUserContext: (ctx: string) => void;
    analyzeQuery: (spl: string, app: string, userContext: string) => Promise<void>;
    setAnalysisNotes: (notes: AnalysisNote[]) => void;
    setAnalysisLoading: (loading: boolean) => void;
}

export const ideInitialState: Pick<IdeSliceState, 'ideResponse' | 'ideRunning' | 'analysisNotes' | 'analysisLoading' | 'ideUserContext'> = {
    ideResponse: null,
    ideRunning: false,
    analysisNotes: [],
    analysisLoading: false,
    ideUserContext: '',
};

let ideAbortController: AbortController | null = null;
let analysisAbortController: AbortController | null = null;

interface IdeStoreGet {
    (): {
        resultsBarExpanded: boolean;
        setResultsBarExpanded: (expanded: boolean) => void;
    };
}

type SetState = (recipe: (draft: IdeSliceState) => void) => void;

export function ideSlice(set: SetState, get: IdeStoreGet): Pick<IdeSliceState, 'runIdeQuery' | 'cancelIdeRun' | 'clearIdeResults' | 'setIdeUserContext' | 'analyzeQuery' | 'setAnalysisNotes' | 'setAnalysisLoading'> {
    return {
        runIdeQuery: async (spl, app, timeRange, userContext, priorAnalysis, allowBlocked) => {
            if (ideAbortController) {
                ideAbortController.abort();
            }
            ideAbortController = new AbortController();
            const controller = ideAbortController;

            set((draft) => {
                draft.ideRunning = true;
                draft.ideResponse = null;
            });

            try {
                const response = await runIdeQuery(
                    app, spl, timeRange, userContext, priorAnalysis, controller.signal, allowBlocked,
                );
                set((draft) => {
                    draft.ideResponse = response;
                    draft.ideRunning = false;
                });
                // Auto-expand results bar when results arrive
                if (!get().resultsBarExpanded) {
                    get().setResultsBarExpanded(true);
                }
            } catch (e) {
                const err = e as { name?: string; message?: string };
                if (err.name === 'AbortError') {
                    set((draft) => {
                        draft.ideRunning = false;
                    });
                } else {
                    set((draft) => {
                        draft.ideRunning = false;
                        draft.ideResponse = {
                            status: 'error',
                            message: err.message || 'IDE query failed',
                            resultCount: 0,
                            executionTimeMs: 0,
                            resultRows: [],
                            splAnalysis: {
                                unauthorizedCommands: [],
                                unusualCommands: [],
                                uniqLimitations: null,
                                commandsUsed: [],
                                warnings: [],
                            },
                            aiNotes: [],
                            warnings: [],
                            errors: [{
                                code: 'RUN_FAILED',
                                message: String(e),
                                severity: 'error',
                            }],
                        };
                    });
                    // Auto-expand on error too
                    if (!get().resultsBarExpanded) {
                        get().setResultsBarExpanded(true);
                    }
                }
            } finally {
                if (ideAbortController === controller) {
                    ideAbortController = null;
                }
            }
        },

        cancelIdeRun: () => {
            if (ideAbortController) {
                ideAbortController.abort();
                ideAbortController = null;
            }
        },

        clearIdeResults: () => {
            set((draft) => {
                draft.ideResponse = null;
            });
        },

        setIdeUserContext: (ctx: string) => {
            set((draft) => {
                draft.ideUserContext = ctx;
            });
        },

        setAnalysisNotes: (notes: AnalysisNote[]) => {
            set((draft) => { draft.analysisNotes = notes; });
        },

        setAnalysisLoading: (loading: boolean) => {
            set((draft) => { draft.analysisLoading = loading; });
        },

        analyzeQuery: async (spl, app, userContext) => {
            if (analysisAbortController) {
                analysisAbortController.abort();
            }
            analysisAbortController = new AbortController();
            const controller = analysisAbortController;

            set((draft) => {
                draft.analysisLoading = true;
            });

            try {
                const result = await analyzeSpl(spl, app, userContext, controller.signal);
                set((draft) => {
                    draft.analysisNotes = result.notes;
                    draft.analysisLoading = false;
                });
            } catch (e) {
                const err = e as { name?: string };
                if (err.name === 'AbortError') {
                    set((draft) => {
                        draft.analysisLoading = false;
                    });
                } else {
                    set((draft) => {
                        draft.analysisLoading = false;
                        draft.analysisNotes = [];
                    });
                }
            } finally {
                if (analysisAbortController === controller) {
                    analysisAbortController = null;
                }
            }
        },
    };
}
