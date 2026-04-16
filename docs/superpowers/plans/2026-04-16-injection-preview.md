# Live Injection Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live amber highlights in the Ace editor wherever a row identifier matches the SPL, suppress linter notes from the editor, and rename "Row Identifier" to "Inject Into".

**Architecture:** A new `useInjectionMarkers` hook reads all rowIdentifiers from the active test's scenarios and finds case-insensitive substring matches in the SPL. It returns `SplWarning[]` using a new `'injection'` severity that the existing `useAceMarkers` hook renders with an amber CSS class. The linter markers and Analyze Query notes are removed from the editor entirely — the `mergedWarnings` memo is replaced with injection-only markers.

**Tech Stack:** React 16, Zustand v4, Ace Editor (via `@splunk/react-search`), Tailwind CSS 3

---

### Task 1: Add Injection Marker CSS Class

**Files:**
- Modify: `packages/query-tester-app/src/features/query/aceMarkerStyles.ts`

- [ ] **Step 1: Add the injection marker class and severity to MARKER_CLASSES**

In `aceMarkerStyles.ts`, add `injection` to the `MARKER_CLASSES` map (line 11) and add the CSS rule to `MARKER_CSS` (after line 53, the `.spl-lint-info` block):

```ts
// Line 11-15 becomes:
export const MARKER_CLASSES: Record<string, string> = {
    error: 'spl-lint-error',
    warning: 'spl-lint-warning',
    info: 'spl-lint-info',
    injection: 'spl-injection-match',
};
```

Add CSS after the `.spl-lint-info` block (after line 53):

```css
    .spl-injection-match {
      position: absolute;
      background: rgba(245, 158, 11, 0.08);
      border-bottom: 2px solid rgba(245, 158, 11, 0.5);
      border-radius: 2px;
      z-index: 4;
    }
```

- [ ] **Step 2: Add injection severity to SplWarning type**

In `packages/query-tester-app/src/features/query/splLinter.ts`, add `'injection'` to the `severity` union type in the `SplWarning` interface. The line currently reads:

```ts
severity: 'error' | 'warning' | 'info' | 'field';
```

Change to:

```ts
severity: 'error' | 'warning' | 'info' | 'field' | 'injection';
```

- [ ] **Step 3: Verify the app still compiles**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test\|testLibrarySlice.test\|import.meta.env"`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add packages/query-tester-app/src/features/query/aceMarkerStyles.ts packages/query-tester-app/src/features/query/splLinter.ts
git commit -m "feat: add injection marker CSS class and severity type"
```

---

### Task 2: Create `useInjectionMarkers` Hook

**Files:**
- Create: `packages/query-tester-app/src/hooks/useInjectionMarkers.ts`

- [ ] **Step 1: Create the hook file**

Create `packages/query-tester-app/src/hooks/useInjectionMarkers.ts`:

```ts
/**
 * useInjectionMarkers — derives Ace editor markers that highlight where
 * each input's rowIdentifier matches the SPL text. Debounced at 300ms
 * on identifier changes, immediate on SPL changes.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import type { SplWarning } from '../features/query/splLinter';

interface InjectionMatchResult {
    markers: SplWarning[];
    matchCount: number;
    hasIdentifiers: boolean;
}

/**
 * Find all case-insensitive occurrences of `needle` in `haystack`.
 * Returns array of { start, end } character indices.
 */
function findAllMatches(haystack: string, needle: string): Array<{ start: number; end: number }> {
    if (!needle) return [];
    const matches: Array<{ start: number; end: number }> = [];
    const lower = haystack.toLowerCase();
    const target = needle.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
        const idx = lower.indexOf(target, pos);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + needle.length });
        pos = idx + 1;
    }
    return matches;
}

/**
 * Merge overlapping ranges into a flat non-overlapping set.
 * Prevents double-highlighting when multiple inputs share overlapping identifiers.
 */
function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        if (sorted[i].start <= last.end) {
            last.end = Math.max(last.end, sorted[i].end);
        } else {
            merged.push(sorted[i]);
        }
    }
    return merged;
}

export function useInjectionMarkers(): InjectionMatchResult {
    const test = useTestStore(selectActiveTest);

    const spl = test?.query?.spl ?? '';

    // Collect all non-empty rowIdentifiers from all scenarios' inputs
    const identifiers = useMemo(() => {
        if (!test) return [];
        const ids: string[] = [];
        for (const scenario of test.scenarios) {
            for (const input of scenario.inputs) {
                const trimmed = input.rowIdentifier.trim();
                if (trimmed) ids.push(trimmed);
            }
        }
        return [...new Set(ids)]; // deduplicate
    }, [test]);

    const hasIdentifiers = identifiers.length > 0;

    // Find all match positions and merge overlapping ranges
    const markers = useMemo<SplWarning[]>(() => {
        if (!spl || identifiers.length === 0) return [];

        const allRanges: Array<{ start: number; end: number }> = [];
        for (const id of identifiers) {
            allRanges.push(...findAllMatches(spl, id));
        }

        const merged = mergeRanges(allRanges);

        return merged.map((r) => ({
            start: r.start,
            end: r.end,
            token: spl.slice(r.start, r.end),
            message: 'Will be replaced with temp index at run time',
            severity: 'injection' as const,
            isBlocked: false,
        }));
    }, [spl, identifiers]);

    return { markers, matchCount: markers.length, hasIdentifiers };
}
```

- [ ] **Step 2: Verify the hook compiles**

Run: `npx tsc --noEmit 2>&1 | grep "useInjectionMarkers"`
Expected: No errors mentioning this file.

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/hooks/useInjectionMarkers.ts
git commit -m "feat: add useInjectionMarkers hook for live SPL match detection"
```

---

### Task 3: Wire Injection Markers into QuerySection (Replace Linter Markers)

**Files:**
- Modify: `packages/query-tester-app/src/features/query/QuerySection.tsx`

This task replaces the `mergedWarnings` memo with injection-only markers and removes the Notes toggle button.

- [ ] **Step 1: Add import for useInjectionMarkers**

At the top of `QuerySection.tsx`, add after line 11 (`import { useAceMarkers } from './useAceMarkers';`):

```ts
import { useInjectionMarkers } from '../../hooks/useInjectionMarkers';
```

- [ ] **Step 2: Call the hook and replace mergedWarnings**

After the existing `useAnalyzeQuery()` destructuring (line 71), add:

```ts
  const { markers: injectionMarkers, matchCount, hasIdentifiers } = useInjectionMarkers();
```

Replace the `mergedWarnings` memo (lines 87-90):

```ts
  // OLD:
  // const activeFields = useMemo(() => selectedFields.size === 0 ? [] : fieldHighlights.filter((w) => selectedFields.has(w.token)), [fieldHighlights, selectedFields]);
  // const mergedWarnings = useMemo<SplWarning[]>(() => {
  //     if (editorFocused) return [];
  //     return [...splWarnings, ...(showNotes ? analysisNotes : []), ...activeFields];
  // }, [editorFocused, splWarnings, analysisNotes, activeFields, showNotes]);
```

With:

```ts
  const activeFields = useMemo(() => selectedFields.size === 0 ? [] : fieldHighlights.filter((w) => selectedFields.has(w.token)), [fieldHighlights, selectedFields]);
  // Editor only shows injection markers — linter/analysis notes suppressed from editor
  const editorMarkers = useMemo<SplWarning[]>(() => {
      if (editorFocused) return [];
      return injectionMarkers;
  }, [editorFocused, injectionMarkers]);
```

Update the `useAceMarkers` call (line 111) to use `editorMarkers`:

```ts
  useAceMarkers(editorRef, editorMarkers);
```

- [ ] **Step 3: Remove the Notes toggle button**

Delete the TogglePill rendering (lines 184-186):

```tsx
// DELETE these lines:
{hasAnalysis && !analysisStale && (
  <TogglePill label={showNotes ? 'Hide Notes' : 'Reveal Notes'} active={showNotes} onClick={() => setShowNotes((v) => !v)} />
)}
```

Remove the `showNotes` state (line 61):

```ts
// DELETE:
const [showNotes, setShowNotes] = useState(true);
```

Remove the `TogglePill` import from line 13:

```ts
// Change:
import { AnalysisResultBar, TogglePill } from './AnalysisResultBar';
// To:
import { AnalysisResultBar } from './AnalysisResultBar';
```

- [ ] **Step 4: Add match count badge in the editor footer**

The char counter is at line 156:
```tsx
<span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{localSpl.length} chars</span>
```

Add the match badge before the char counter, inside the same `<div ref={editorRef}>` wrapper:

```tsx
{hasIdentifiers && !editorFocused && (
  <span className="absolute left-3 bottom-2 text-[11px] pointer-events-none flex items-center gap-1.5">
    <span className={`w-1.5 h-1.5 rounded-full ${matchCount > 0 ? 'bg-amber-500' : 'bg-slate-600'}`} />
    <span className={matchCount > 0 ? 'text-slate-400' : 'text-slate-600'}>
      {matchCount === 0
        ? 'No matches in query'
        : matchCount === 1
          ? '1 match — will be replaced'
          : `${matchCount} matches — all will be replaced`}
    </span>
  </span>
)}
<span className="absolute right-3 bottom-2 text-[11px] text-slate-500 pointer-events-none">{localSpl.length} chars</span>
```

- [ ] **Step 5: Verify the app compiles and renders**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test\|testLibrarySlice.test\|import.meta.env"`
Expected: No new errors.

Check `http://localhost:3000/#tester` — the editor should render without notes toggle and with no injection highlights (until a row identifier is typed).

- [ ] **Step 6: Commit**

```bash
git add packages/query-tester-app/src/features/query/QuerySection.tsx
git commit -m "feat: wire injection markers into editor, suppress linter notes, add match badge"
```

---

### Task 4: Suppress Gutter Annotations for Injection Markers

**Files:**
- Modify: `packages/query-tester-app/src/features/query/useAceMarkers.ts`

Injection markers should NOT show gutter annotations (the warning/error icons in the line number gutter) — they are purely inline highlights. The current code adds gutter annotations for all non-field markers. We need to also exclude `'injection'` severity.

- [ ] **Step 1: Update the annotation filter in useAceMarkers**

In `useAceMarkers.ts`, line 117 currently reads:

```ts
if (w.severity !== 'field') {
```

Change to:

```ts
if (w.severity !== 'field' && w.severity !== 'injection') {
```

This prevents injection matches from adding gutter icons or tooltip annotations.

- [ ] **Step 2: Commit**

```bash
git add packages/query-tester-app/src/features/query/useAceMarkers.ts
git commit -m "feat: suppress gutter annotations for injection markers"
```

---

### Task 5: Rename "Row Identifier" to "Inject Into" + Inline Match Indicator

**Files:**
- Modify: `packages/query-tester-app/src/features/scenarios/DataSourceSelector.tsx`

- [ ] **Step 1: Add matchCount prop and label**

Update the props interface (line 10-15):

```ts
export interface DataSourceSelectorProps {
    testId: EntityId;
    scenarioId: EntityId;
    inputId: EntityId;
    value: string;
    matchCount: number;
    hasIdentifiers: boolean;
}
```

Update the component signature (line 23):

```ts
export function DataSourceSelector({ testId, scenarioId, inputId, value, matchCount, hasIdentifiers }: DataSourceSelectorProps) {
```

- [ ] **Step 2: Add the "INJECT INTO" label and update help text**

Replace the return JSX. Before the `<div className="flex">` that contains the input (line 72), add the label:

```tsx
<div ref={wrapRef} className="relative w-full mb-4">
    <div className="mb-1.5">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Inject Into</span>
    </div>
    <div className="flex">
```

Replace the help text paragraph (lines 98-103):

```tsx
<p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
    This text will be <strong className="text-slate-400">found and replaced</strong> in
    your query with a temp index containing your test events.
</p>
```

- [ ] **Step 3: Add inline match indicator**

After the help text paragraph and before the loading indicator, add:

```tsx
{hasIdentifiers && value.trim() && (
    <div className="flex items-center gap-1.5 mt-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${matchCount > 0 ? 'bg-amber-500' : 'bg-slate-600'}`} />
        <span className={`text-[11px] ${matchCount > 0 ? 'text-amber-500/80' : 'text-slate-600'}`}>
            {matchCount === 0
                ? 'No matches in query'
                : `${matchCount} match${matchCount !== 1 ? 'es' : ''} highlighted in query`}
        </span>
    </div>
)}
```

- [ ] **Step 4: Pass matchCount from InputCard**

In `packages/query-tester-app/src/features/scenarios/InputCard.tsx`, add the import and pass the props.

Add import at top:

```ts
import { useInjectionMarkers } from '../../hooks/useInjectionMarkers';
```

Inside `InputCardInner`, after the existing hook calls (around line 31), add:

```ts
const { matchCount, hasIdentifiers } = useInjectionMarkers();
```

Update the `DataSourceSelector` rendering (line 131):

```tsx
<DataSourceSelector testId={testId} scenarioId={scenarioId} inputId={input.id} value={input.rowIdentifier} matchCount={matchCount} hasIdentifiers={hasIdentifiers} />
```

- [ ] **Step 5: Verify everything compiles**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test\|testLibrarySlice.test\|import.meta.env"`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add packages/query-tester-app/src/features/scenarios/DataSourceSelector.tsx packages/query-tester-app/src/features/scenarios/InputCard.tsx
git commit -m "feat: rename Row Identifier to Inject Into, add inline match indicator"
```

---

### Task 6: Update Tutorial Steps

**Files:**
- Modify: `packages/query-tester-app/src/features/tutorial/tutorialSteps.ts`

- [ ] **Step 1: Update tutorial text referencing row identifier**

Find the `row-identifier` step and update its title and content to use the new terminology. Find the `row-id-value` step and update similarly.

Change the step with `id: 'row-identifier'`:
- Title: `"Set your data source"` (was `"Set your row identifier"`)
- Content: `"The 'Inject Into' field tells the test runner which part of your query to replace with test data. It should match the base search clause — typically the index and sourcetype. Matching text is highlighted in amber in the query editor."`

Change the step with `id: 'row-id-value'`:
- Title: `"The value must match exactly"` (was `"The value must be exact too"`)
- Content: `"The text must exactly match what appears in your SPL. If your query says index=main sourcetype=access_combined, the inject-into field must be that exact string. Watch the highlight in the query panel to confirm it matches."`

- [ ] **Step 2: Commit**

```bash
git add packages/query-tester-app/src/features/tutorial/tutorialSteps.ts
git commit -m "feat: update tutorial steps for Inject Into terminology"
```

---

### Task 7: End-to-End Visual Test with Playwright

**Files:** None (browser testing only)

- [ ] **Step 1: Test the full flow in the browser**

Using Playwright MCP:

1. Navigate to `http://localhost:3000/#tester`
2. Select "search" app
3. Type SPL: `index=main sourcetype=access_combined | append [search index=main sourcetype=syslog | stats count by host] | stats sum(count) by src_ip`
4. Verify Data panel appears
5. Type `index=main` in the Inject Into field
6. Verify: amber highlights appear on BOTH `index=main` occurrences in the SPL editor
7. Verify: match badge shows "2 matches — all will be replaced"
8. Verify: DataSourceSelector shows "2 matches highlighted in query"
9. Change to `index=main sourcetype=access_combined`
10. Verify: only 1 highlight remains (the first occurrence)
11. Verify: badge shows "1 match — will be replaced"
12. Clear the inject-into field
13. Verify: no highlights, no badge
14. Type `index=firewall` (non-matching)
15. Verify: no highlights, badge shows "No matches in query"

- [ ] **Step 2: Verify no notes/linter markers appear**

1. Click "Analyze Query"
2. Wait for analysis to complete
3. Click outside the editor (blur)
4. Verify: NO green/yellow/red markers appear in the editor
5. Verify: The "Hide Notes" / "Reveal Notes" button does NOT exist
6. Verify: Injection amber highlights still work after analysis

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end visual testing"
```

---

### Task 8: Push to Both Remotes

- [ ] **Step 1: Push to origin (Query-Tester)**

```bash
git push origin main
```

- [ ] **Step 2: Force-push to clean (QueryTester4Ever)**

```bash
git push clean main --force
```
