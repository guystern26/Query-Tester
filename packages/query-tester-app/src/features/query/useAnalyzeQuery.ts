/**
 * useAnalyzeQuery — custom hook for LLM-powered SPL code review.
 * All state is component-local (transient UI, not persisted in Zustand).
 */
import { useState, useRef, useCallback } from 'react';
import type { SplWarning } from './splLinter';
import type { AnalyzeQueryNote, SkillSnippet } from '../../api/llmApi';
import { analyzeQuery } from '../../api/llmApi';
import { mapNotesToWarnings, mapFieldsToHighlights, findUnmatchedNotes } from './splAnalyzer';

export interface TrackedField {
    name: string;
    colorIndex: number;
}

export interface AnalyzeQueryState {
    isAnalyzing: boolean;
    isStale: boolean;
    hasResults: boolean;
    analysisNotes: SplWarning[];
    fieldHighlights: SplWarning[];
    explanation: string;
    analysisSummary: string;
    analysisError: string;
    unmatchedNotes: AnalyzeQueryNote[];
    trackedFields: TrackedField[];
    runAnalysis: (spl: string, skills?: SkillSnippet[]) => void;
    clearAnalysis: () => void;
    markStale: () => void;
}

export function useAnalyzeQuery(): AnalyzeQueryState {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isStale, setIsStale] = useState(false);
    const [analysisNotes, setAnalysisNotes] = useState<SplWarning[]>([]);
    const [fieldHighlights, setFieldHighlights] = useState<SplWarning[]>([]);
    const [explanation, setExplanation] = useState('');
    const [analysisSummary, setAnalysisSummary] = useState('');
    const [analysisError, setAnalysisError] = useState('');
    const [unmatchedNotes, setUnmatchedNotes] = useState<AnalyzeQueryNote[]>([]);
    const [trackedFields, setTrackedFields] = useState<TrackedField[]>([]);

    /** Guard against stale results if SPL changes during the LLM call. */
    const splRef = useRef('');
    /** Track whether we have any results to show. */
    const hasResults = !!(explanation || analysisSummary || analysisError);

    const clearAnalysis = useCallback(() => {
        setAnalysisNotes([]);
        setFieldHighlights([]);
        setExplanation('');
        setAnalysisSummary('');
        setAnalysisError('');
        setUnmatchedNotes([]);
        setTrackedFields([]);
        setIsStale(false);
        splRef.current = '';
    }, []);

    const markStale = useCallback(() => {
        if (hasResults) {
            setIsStale(true);
            setAnalysisNotes([]);
            setFieldHighlights([]);
        }
    }, [hasResults]);

    const runAnalysis = useCallback((spl: string, skills?: SkillSnippet[]) => {
        if (!spl.trim()) return;
        splRef.current = spl;
        setIsAnalyzing(true);
        setIsStale(false);
        setAnalysisError('');

        analyzeQuery(spl, skills)
            .then((result) => {
                // Discard if SPL changed while awaiting
                if (splRef.current !== spl) return;

                setExplanation(result.explanation);
                setAnalysisSummary(result.summary);
                setAnalysisNotes(mapNotesToWarnings(spl, result.notes));
                setFieldHighlights(mapFieldsToHighlights(spl, result.fields));
                setUnmatchedNotes(findUnmatchedNotes(spl, result.notes));
                setTrackedFields(
                    result.fields.map((name, i) => ({ name, colorIndex: i })),
                );
            })
            .catch((err: Error) => {
                if (splRef.current !== spl) return;
                setAnalysisError(err.message || 'Analysis failed');
            })
            .finally(() => {
                if (splRef.current === spl) setIsAnalyzing(false);
            });
    }, []);

    return {
        isAnalyzing,
        isStale,
        hasResults,
        analysisNotes,
        fieldHighlights,
        explanation,
        analysisSummary,
        analysisError,
        unmatchedNotes,
        trackedFields,
        runAnalysis,
        clearAnalysis,
        markStale,
    };
}
