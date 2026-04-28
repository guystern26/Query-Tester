# Interactive Data Source Picker — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Phase 1 issues (empty input reuse, non-index commands, clickability, Query step preview) and add Phase 2 polish (hover tooltips, drag-select, injection preview, match count).

**Architecture:** Phase 1 fixes first (Tasks 1-4), then Phase 2 features (Tasks 5-9). Each task is independently shippable.

**Tech Stack:** React 16.13, Zustand v4 (default import), Tailwind CSS 3, TypeScript (no `?.`/`??`)

**Constraints:** No `any` types. Named Props interfaces. Files under 200 lines. No React 18 APIs. Python 3.7 backend. Run `npx tsc --noEmit` and webpack build clean before done.

**Spec:** `docs/superpowers/specs/2026-04-28-interactive-data-source-picker.md` (sections 12-13 for fixes)

---

## Phase 1 Fixes

### Task 1: Use existing empty input instead of creating new one

**Files:**
- Modify: `packages/query-tester-app/src/core/store/slices/inputSlice.ts`

**Problem:** `addInputFromSource` always pushes a new input. It should check if the first input in the scenario is empty (no row identifier, no field data) and fill it instead.

- [ ] **Step 1: Update addInputFromSource logic**

In the `addInputFromSource` action, before creating a new input, check if an empty input exists:

```typescript
    addInputFromSource: (testId: EntityId, scenarioId: EntityId, rowIdentifier: string, fields: string[]) =>
      set((draft) => {
        const test = findTest(draft.tests, testId);
        const scenario = test ? findScenario(test.scenarios, scenarioId) : undefined;
        if (!scenario) return;

        // Check if there's an existing empty input we can fill
        var emptyInput = null;
        for (var i = 0; i < scenario.inputs.length; i++) {
          var inp = scenario.inputs[i];
          if (!inp.rowIdentifier.trim() && inp.events.length <= 1) {
            var hasData = inp.events.length === 1 && inp.events[0].fieldValues.some(
              function (fv) { return fv.field.trim() !== '' || fv.value.trim() !== ''; }
            );
            if (!hasData) { emptyInput = inp; break; }
          }
        }

        if (emptyInput) {
          // Fill existing empty input
          emptyInput.rowIdentifier = rowIdentifier;
          emptyInput.inputMode = 'fields';
          if (fields.length > 0 && emptyInput.events.length > 0) {
            emptyInput.events[0].fieldValues = fields.map(function (f) {
              return { id: crypto.randomUUID(), field: f, value: '' };
            });
          }
        } else {
          // Create new input
          if (scenario.inputs.length >= MAX_INPUTS_PER_SCENARIO) return;
          const newInput = createDefaultInput();
          newInput.rowIdentifier = rowIdentifier;
          newInput.inputMode = 'fields';
          if (fields.length > 0 && newInput.events.length > 0) {
            newInput.events[0].fieldValues = fields.map(function (f) {
              return { id: crypto.randomUUID(), field: f, value: '' };
            });
          }
          scenario.inputs.push(newInput);
        }
      }),
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Commit**

---

### Task 2: Recognize non-index commands as data sources

**Files:**
- Modify: `packages/query-tester-app/src/hooks/useSourceSpans.ts`

**Problem:** `useSourceSpans` only matches text from LLM extraction. It should also do a regex fallback for `| inputlookup`, `| rest`, `` `cache(...)` ``, `| tstats ... where index=`, `| lookup <table>`.

- [ ] **Step 1: Add regex fallback patterns**

After the LLM-based span detection, scan for unmatched command patterns:

```typescript
var COMMAND_PATTERNS = [
    // | inputlookup <file>
    { re: /(?:\|\s*)?inputlookup\s+[\w\-\.]+(?:\.csv)?/gi, label: 'inputlookup' },
    // | rest <endpoint> (up to next pipe)
    { re: /(?:\|\s*)?rest\s+[^|]+?(?=\s*\||$)/gi, label: 'rest' },
    // `cache(...)`
    { re: /`cache\([^)]+\)`/gi, label: 'cache' },
    // | lookup <table>
    { re: /\|\s*lookup\s+([\w\-\.]+)/gi, label: 'lookup' },
];
```

After building spans from LLM sources, scan SPL for each pattern. For any match that doesn't overlap an existing span, add it as a span with `sourceIndex = -1` (fallback source — no LLM fields, just the text).

- [ ] **Step 2: Update SourceSpan interface**

Add optional `isFallback: boolean` to `SourceSpan`. Fallback sources show in the sidebar as clickable but without pre-populated fields.

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Test with queries like `| inputlookup users.csv | stats count` and `| rest /services/server/info`**
- [ ] **Step 5: Commit**

---

### Task 3: Make clickable sources more obvious

**Files:**
- Modify: `packages/query-tester-app/src/features/layout/InteractiveSidebar.tsx`
- Modify: `packages/query-tester-app/src/globals.css`

**Problem:** Subtle underline is not noticeable enough. Users miss that sources are clickable.

- [ ] **Step 1: Add pulse animation on Data step load**

In `globals.css`, add:

```css
@keyframes sourceHighlight {
  0% { background-color: transparent; }
  30% { background-color: rgba(147, 197, 253, 0.15); }
  60% { background-color: rgba(147, 197, 253, 0.08); }
  100% { background-color: transparent; }
}
```

- [ ] **Step 2: Apply animation + improve visual cues in InteractiveSidebar**

For unconfigured sources:
- Dotted bottom border instead of solid (more obviously interactive)
- On first render, play `sourceHighlight` animation (2s) on all unconfigured sources
- Cursor: pointer
- Title tooltip: "Click to inject test data here"

For configured sources:
- Solid border in accent color (already done)
- Small colored dot before the text

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

---

### Task 4: Data source preview on Query step

**Files:**
- Modify: `packages/query-tester-app/src/features/query/QuerySection.tsx`
- Modify: `packages/query-tester-app/src/hooks/useInjectionMarkers.ts`

**Problem:** Users want to see data sources highlighted in the query editor on Step 1, not just Step 2.

- [ ] **Step 1: Add data source markers to the editor**

After `extractDataSources` runs (via Analyze Query or auto-extraction), add markers to the Ace editor showing detected sources as light blue highlights — similar to existing injection markers but with a different severity level (`'datasource'` instead of `'injection'`).

In `useInjectionMarkers.ts`, add a new memo that creates markers from `test.fieldExtraction.sources`:

```typescript
var sourceMarkers = useMemo(function (): SplWarning[] {
    if (!test || !test.fieldExtraction || !test.fieldExtraction.sources) return [];
    var result: SplWarning[] = [];
    var sources = test.fieldExtraction.sources;
    for (var i = 0; i < sources.length; i++) {
        var matches = findAllMatches(spl, sources[i].rowIdentifier);
        for (var j = 0; j < matches.length; j++) {
            result.push({
                start: matches[j].start,
                end: matches[j].end,
                token: spl.slice(matches[j].start, matches[j].end),
                message: 'Data source: ' + sources[i].fields.join(', '),
                severity: 'datasource' as 'datasource',
                isBlocked: false,
            });
        }
    }
    return result;
}, [test, spl]);
```

Merge `sourceMarkers` into the returned markers (with lower priority than injection markers).

- [ ] **Step 2: Add 'datasource' severity styling in useAceMarkers**

In the Ace marker renderer, add a style for `'datasource'` severity: light blue-300/10 background with blue-300/30 border-bottom. Gutter annotation shows a small blue dot.

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

---

## Phase 2 Features

### Task 5: Hover tooltips on sidebar sources

**Files:**
- Create: `packages/query-tester-app/src/features/layout/SourceTooltip.tsx`
- Modify: `packages/query-tester-app/src/features/layout/InteractiveSidebar.tsx`

- [ ] **Step 1: Create SourceTooltip component**

Small floating tooltip showing source status:
- Unconfigured: "Click to add test data" + field list
- Configured: "N events, M fields — click to scroll"

Positioned to the right of the hovered span, navy-800 background, small arrow.

- [ ] **Step 2: Wire into InteractiveSidebar**

On `onMouseEnter` of a source span, show tooltip. On `onMouseLeave`, hide. Use a `hoveredIndex` state + timeout for debounce.

- [ ] **Step 3: For configured sources, clicking scrolls to the input card**

Add `scrollIntoView` behavior: when clicking a configured source, find the corresponding InputCard by data-input-id attribute and scroll it into view with a brief highlight flash.

- [ ] **Step 4: Verify TypeScript compiles**
- [ ] **Step 5: Commit**

---

### Task 6: Drag-select custom sources

**Files:**
- Modify: `packages/query-tester-app/src/features/layout/InteractiveSidebar.tsx`

- [ ] **Step 1: Add onMouseUp handler for text selection**

On the sidebar `<pre>` element, listen for `onMouseUp`. If `window.getSelection()` has selected text:
- Show a small floating "Add as data source" button above the selection
- Clicking it calls `onSourceClick(selectedText, [])` (empty fields — user fills manually)
- The button disappears on click or when selection changes

- [ ] **Step 2: Style the floating button**

Small navy-700 pill with blue-300 text: "+ Add as data source". Positioned absolutely above the selection range.

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

---

### Task 7: Injection preview panel

**Files:**
- Create: `packages/query-tester-app/src/features/scenarios/InjectionPreview.tsx`
- Modify: `packages/query-tester-app/src/features/scenarios/ScenarioPanel.tsx`

- [ ] **Step 1: Create InjectionPreview component**

Collapsible panel at the bottom of the Data step showing the final SPL with all row identifier replacements applied:
- Each row identifier replaced with `index=temp_query_tester run_id_preview=preview`
- Uses the same syntax highlighting as the sidebar (`renderHighlightedSpl`)
- Collapsed by default: "Preview injected query ▸"
- Updates live when badges are edited

- [ ] **Step 2: Wire into ScenarioPanel**

Add below the input cards list, before the "Add another input" button.

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

---

### Task 8: Match count ×N indicator

**Files:**
- Modify: `packages/query-tester-app/src/features/scenarios/SourceBadge.tsx`
- Modify: `packages/query-tester-app/src/hooks/useSourceSpans.ts`

- [ ] **Step 1: Count occurrences per row identifier**

In `useSourceSpans`, export a helper `countMatches(spl, rowIdentifier)` that returns the number of case-insensitive occurrences.

- [ ] **Step 2: Show count in SourceBadge**

Already partially implemented (matchCount prop). Ensure it's always calculated and shown as `×N` when N > 1. Add tooltip: "This text appears N times in your query — all will be replaced."

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

---

### Task 9: Final verification and audit

- [ ] **Step 1: Run TypeScript check** — `npx tsc --noEmit`
- [ ] **Step 2: Webpack build** — clean
- [ ] **Step 3: Visual test** — all interactions in browser
- [ ] **Step 4: Run splunk-query-tester-audit** on all new/modified files
- [ ] **Step 5: Commit and push to both repos**

---

## Self-Review Checklist

| Requirement | Task |
|-------------|------|
| Fix: use empty input instead of creating new | Task 1 |
| Fix: recognize inputlookup/rest/cache/lookup | Task 2 |
| Fix: make sources more obviously clickable | Task 3 |
| Fix: data source preview on Query step | Task 4 |
| Hover tooltips with event count | Task 5 |
| Drag-select custom sources | Task 6 |
| Injection preview panel | Task 7 |
| Match count ×N | Task 8 |
| Audit + push | Task 9 |
