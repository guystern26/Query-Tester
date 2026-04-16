import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import '@splunk/react-search/components/Ace'; // Ace must load before Input
import SearchInput from '@splunk/react-search/components/Input';
import debounce from 'lodash/debounce';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { SearchableSelect, Message } from '../../common';
import { TimeRangePicker } from './TimeRangePicker';
import { lintSpl, SplWarning } from './splLinter';
import { useAceMarkers } from './useAceMarkers';
import { useAnalyzeQuery } from './useAnalyzeQuery';
import { AnalysisResultBar, TogglePill } from './AnalysisResultBar';
import { IDE_POLICY } from './ideCommandPolicy';
import { formatSpl } from './splFormatter';
import { useSplSyntax } from '../../hooks/useSplSyntax';

const APP_CHANGE_MSG = 'You changed the app. Some lookups and saved searches may not be available.';

interface QuerySectionProps {
  isIde?: boolean;
}

export function QuerySection({ isIde }: QuerySectionProps) {
  const test = useTestStore(selectActiveTest);
  const commandPolicy = useTestStore((s) => s.commandPolicy);
  const splDriftWarning = useTestStore((s) => s.splDriftWarning);
  const updateSpl = useTestStore((s) => s.updateSpl);
  const setTimeRange = useTestStore((s) => s.setTimeRange);
  const fetchSavedSearchSpl = useTestStore((s) => s.fetchSavedSearchSpl);
  const reloadDriftedSpl = useTestStore((s) => s.reloadDriftedSpl);
  const clearSplDriftWarning = useTestStore((s) => s.clearSplDriftWarning);
  const setStoreAnalysisNotes = useTestStore((s) => s.setAnalysisNotes);
  const setStoreAnalysisLoading = useTestStore((s) => s.setAnalysisLoading);
  const chatSkills = useTestStore((s) => s.chatSkills);
  const extractDS = useTestStore((s) => s.fetchExtractDataSources);
  const suggestVF = useTestStore((s) => s.fetchSuggestValidationFields);

  const app = test?.app ?? '';
  const spl = test?.query?.spl ?? '';
  const origin = test?.query?.savedSearchOrigin ?? '';
  const effectivePolicy = isIde ? IDE_POLICY : commandPolicy;
  const splSyntax = useSplSyntax();

  // Local SPL state for debounced store writes
  const [localSpl, setLocalSpl] = useState(spl);
  useEffect(() => { setLocalSpl(spl); }, [spl]);

  const debouncedUpdateSpl = useMemo(
      () => debounce((id: string, value: string) => { updateSpl(id, value); }, 500),
      [updateSpl],
  );
  useEffect(() => () => { debouncedUpdateSpl.cancel(); }, [debouncedUpdateSpl]);

  const { savedSearches, loading, error } = useSavedSearches(app);

  const prevApp = useRef(app);
  const [appChanged, setAppChanged] = useState(false);
  const [splWarnings, setSplWarnings] = useState<SplWarning[]>([]);
  const [editorFocused, setEditorFocused] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);

  // LLM analysis state
  const {
    isAnalyzing, isStale: analysisStale, hasResults: hasAnalysis,
    analysisNotes, fieldHighlights, explanation,
    analysisSummary, analysisError, unmatchedNotes, trackedFields,
    runAnalysis, clearAnalysis, markStale,
  } = useAnalyzeQuery();

  // Sync analysis loading + results to Zustand store for IntelligencePanel sidebar
  useEffect(() => { setStoreAnalysisLoading(isAnalyzing); }, [isAnalyzing, setStoreAnalysisLoading]);
  useEffect(() => {
    if (!hasAnalysis && !analysisError) { setStoreAnalysisNotes([]); return; }
    const toNote = (w: SplWarning, i: number, p: string) => ({ id: p + i, message: w.message, category: 'general',
      severity: (w.severity === 'error' ? 'error' : w.severity === 'warning' ? 'warning' : 'info') as 'error' | 'warning' | 'info',
      line: null as number | null, suggestion: null as string | null, source: 'llm' as const });
    const unmatched = unmatchedNotes.map((n, i) => ({ id: 'u-' + i, message: n.message, category: n.category || 'general',
      severity: 'info' as const, line: null, suggestion: null, source: 'llm' as const }));
    setStoreAnalysisNotes([...analysisNotes.map((w, i) => toNote(w, i, 'm-')), ...unmatched]);
  }, [hasAnalysis, analysisError, unmatchedNotes, analysisNotes, setStoreAnalysisNotes]);

  // Merge warnings; hide all while focused; filter fields by click-selection
  const activeFields = useMemo(() => selectedFields.size === 0 ? [] : fieldHighlights.filter((w) => selectedFields.has(w.token)), [fieldHighlights, selectedFields]);
  const mergedWarnings = useMemo<SplWarning[]>(() => {
    if (editorFocused) return [];
    return [...splWarnings, ...(showNotes ? analysisNotes : []), ...activeFields];
  }, [editorFocused, splWarnings, analysisNotes, activeFields, showNotes]);

  // Mark stale when SPL changes (ignore whitespace-only diffs from formatting)
  const normSpl = (s: string) => s.replace(/\s+/g, ' ').trim();
  const prevSplRef = useRef(localSpl);
  useEffect(() => { if (normSpl(prevSplRef.current) !== normSpl(localSpl)) { markStale(); setSelectedFields(new Set()); } prevSplRef.current = localSpl; }, [localSpl, markStale]);

  const handleToggleField = useCallback((name: string) => {
    setSelectedFields((prev) => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n; });
  }, []);
  const handleEditorFocus = useCallback(() => { setEditorFocused(true); }, []);
  const handleEditorBlur = useCallback(() => {
    debouncedUpdateSpl.flush(); setEditorFocused(false);
    setSplWarnings(lintSpl(localSpl, effectivePolicy));
  }, [localSpl, effectivePolicy, debouncedUpdateSpl]);

  useEffect(() => { // Re-lint on external SPL/policy change
    if (!editorRef.current?.contains(document.activeElement)) setSplWarnings(lintSpl(localSpl, effectivePolicy));
  }, [localSpl, effectivePolicy]);

  // Apply inline Ace markers + gutter annotations + hover tooltips
  useAceMarkers(editorRef, mergedWarnings);

  useEffect(() => { if (app !== prevApp.current && prevApp.current !== '') setAppChanged(true); prevApp.current = app; }, [app]);
  const ssOptions = savedSearches.map((s) => ({ value: s.name, label: s.name }));

  const handleSavedSearch = async (value: string) => {
    if (!test || !app || !value) return;
    try { await fetchSavedSearchSpl(test.id, app, value); } catch { /* leave SPL unchanged */ }
  };

  const handleSplChange = (_e: React.SyntheticEvent, { value }: { value: string }) => {
    if (test) {
      setLocalSpl(value);
      debouncedUpdateSpl(test.id, value);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isIde && (
        <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/40 text-[12px] text-slate-400 leading-relaxed">
          This runs SPL directly against Splunk — treat it like any search bar query. All commands except <span className="text-red-400 font-medium">delete</span> are allowed. Commands with side effects are highlighted.
        </div>
      )}
      {splDriftWarning && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-200 text-[13px]">
          <span className="flex-1">{splDriftWarning}</span>
          <button className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-700/40 hover:bg-amber-700/60 text-amber-100 transition cursor-pointer whitespace-nowrap" onClick={() => reloadDriftedSpl()}>Reload SPL</button>
          <button className="text-amber-400 hover:text-amber-200 transition cursor-pointer" onClick={() => clearSplDriftWarning()}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>)}

      {appChanged && (
        <Message type="warning" dismissible onDismiss={() => setAppChanged(false)}>
          {APP_CHANGE_MSG}
        </Message>
      )}

      <div><label className="block mb-1 text-slate-400 text-[13px]">Load from saved search</label>
        <SearchableSelect value={origin} options={ssOptions} onChange={handleSavedSearch} disabled={loading} placeholder="Search saved searches..." />
        {error && <div className="mt-1 text-[13px] text-red-400">{error}</div>}
      </div>

      <div className="flex gap-3 items-start">
        <div ref={editorRef} className="relative flex-1 min-w-0" onFocus={handleEditorFocus} onBlur={handleEditorBlur}>
          <SearchInput value={localSpl} onChange={handleSplChange} syntax={splSyntax} placeholder="index=main sourcetype=access_combined | stats count by src_ip" minLines={6} maxLines={20} showLineNumbers />
          <span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{localSpl.length} chars</span>
        </div>

        {test && (
          <div className="flex flex-col gap-2 flex-shrink-0 pt-0.5">
            <TimeRangePicker value={test.query?.timeRange} onChange={(tr) => setTimeRange(test.id, tr)} />
            <button
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap tracking-wide border ${analysisStale ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse' : 'border-slate-600 text-blue-300 hover:border-slate-500 hover:text-blue-200'}`}
              disabled={isAnalyzing || !localSpl.trim()} onClick={() => {
                const formatted = formatSpl(localSpl);
                if (formatted !== localSpl) {
                  setLocalSpl(formatted);
                  if (test) updateSpl(test.id, formatted);
                }
                setSelectedFields(new Set());
                const skills = chatSkills.filter((s) => s.enabled).map((s) => ({ name: s.name, prompt: s.prompt }));
                runAnalysis(formatted, skills.length > 0 ? skills : undefined);
                // Fire extract + suggest in parallel (background)
                if (test && !isIde) { const sid = test.scenarios[0]?.id; if (sid) void extractDS(test.id, sid, formatted).catch(() => {}); void suggestVF(test.id, formatted).catch(() => {}); }
              }}>
              {isAnalyzing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" /></svg>
              )}
              {isAnalyzing ? 'Analyzing...' : analysisStale ? 'Re-analyze Query' : 'Analyze Query'}
            </button>
            {analysisStale && <span className="text-[11px] text-amber-400/80 text-center leading-tight">Query changed — re-analyze for updated results.</span>}
            {hasAnalysis && !analysisStale && (
              <TogglePill label={showNotes ? 'Hide Notes' : 'Reveal Notes'} active={showNotes} onClick={() => setShowNotes((v) => !v)} />
            )}
          </div>
        )}
      </div>

      <AnalysisResultBar
        explanation={explanation}
        trackedFields={trackedFields}
        selectedFields={selectedFields}
        onToggleField={handleToggleField}
        analysisSummary={analysisSummary}
        unmatchedNotes={unmatchedNotes}
        analysisError={analysisError}
        onClear={clearAnalysis}
      />
    </div>
  );
}
