# Live Injection Preview — Design Spec

**Date:** 2026-04-16
**Status:** Draft

## Problem

The "Row Identifier" concept in the Data panel is confusing. Users don't understand:
- What it does (string find-and-replace in their SPL)
- What part of their query will be affected
- Whether their identifier actually matches anything
- Why partial matches replace multiple occurrences

They get no feedback until they run the test and see unexpected results.

## Solution

Three coordinated changes that make the injection mechanic visible and intuitive:

1. **Live amber highlighting in the Ace editor** — as the user types in the data source field, matching text in the SPL lights up
2. **Suppress linter notes from the editor** — keep the editor clean for injection highlighting only; analysis notes move to results
3. **Rename "Row Identifier" to "Inject Into"** — clearer label with better help text

## Design

### 1. Live Injection Highlighting

**Trigger:** The user types or changes the "Inject Into" field in any Input card. Debounced at 300ms.

**Matching logic:**
- Case-insensitive substring search of each input's `rowIdentifier` against the full SPL text
- Find all occurrence positions (start index, length)
- Multiple inputs can each have their own rowIdentifier — all are highlighted simultaneously (same amber color; they all represent injection points)

**Visual treatment in Ace editor:**
- **Amber underline** (`border-bottom: 2px solid rgba(245, 158, 11, 0.5)`) on matched text
- **Faint amber background** (`rgba(245, 158, 11, 0.08)`) behind matched text
- Uses Ace marker API (same mechanism as existing `useAceMarkers` hook for linter warnings)
- Marker type: custom CSS class, not the existing green/yellow linter classes

**Match count badge in editor footer:**
- Sits in the existing footer bar next to the "X chars" counter, left-aligned
- States:
  - `N match(es) — will be replaced with test data` — amber dot, slate text
  - `N matches — both will be replaced` (when N > 1) — amber dot, amber text (advisory)
  - `No matches in query — test data won't be injected` — slate dot, muted slate text
  - Empty (no row identifier typed) — badge hidden entirely
- The badge reflects the total across ALL inputs in the active scenario (not just the focused one)

**Edge cases:**
- Empty rowIdentifier: no highlights, no badge
- rowIdentifier is whitespace-only: treated as empty
- Multiple inputs with overlapping matches: highlight union of all ranges (don't double-highlight overlapping regions)
- SPL changes (user edits query): re-run match on next debounce tick

### 2. Suppress Linter Notes from Editor

**Current behavior:** `splLinter.ts` runs `lintSpl()` on editor blur and applies Ace markers (green info, yellow warning) for dangerous commands and cache macros. A "Hide Notes" button toggles visibility.

**New behavior:**
- The linter still runs internally (the data is needed for results)
- Ace markers from `lintSpl()` are **never applied** to the editor — force `showLintMarkers = false` permanently
- The "Hide Notes" / "Show Notes" toggle button in `QuerySection.tsx` is removed from the UI
- Linter warnings still appear in the test results section (no change there)
- The `useAceMarkers` hook is repurposed exclusively for injection preview highlights

**Rationale:** The editor should have one visual language. Mixing green/yellow linter notes with amber injection highlights creates confusion. Linter notes are most useful after a run (in results context), not during editing.

### 3. Rename "Row Identifier" to "Inject Into"

**Label change:** The field label above the data source input in `InputCard.tsx` / `DataSourceSelector.tsx` changes from no explicit label (just placeholder text) to:

```
INJECT INTO
┌─────────────────────────────────────────────┐
│ index=main sourcetype=access_combined       │ ▾
└─────────────────────────────────────────────┘
This text will be found and replaced in your query
with a temp index containing your test events.
```

**Placeholder:** `e.g., index=main sourcetype=access_combined` (unchanged)

**Help text (new):** "This text will be **found and replaced** in your query with a temp index containing your test events."

**Inline match indicator:** Below the help text, a small dot + text echoing the editor badge:
- `● 1 match highlighted in query` (amber)
- `● 2 matches highlighted in query` (amber)
- `● No matches in query` (muted slate)
- Hidden when field is empty

**Tutorial steps:** Update `tutorialSteps.ts` references from "row identifier" to "inject into" / "data source". Update step content to reference the live highlighting.

## Architecture

### New hook: `useInjectionMarkers`

Located at `src/hooks/useInjectionMarkers.ts`. Responsible for:

1. Reading all `rowIdentifier` values from inputs in the active scenario
2. Finding all match positions in the current SPL (case-insensitive)
3. Converting positions to Ace Range markers with the amber CSS class
4. Returning `{ markers: AceMarker[], matchCount: number, hasIdentifiers: boolean }`

Called from `QuerySection.tsx`, passes markers to the Ace editor ref.

Debounce: 300ms on rowIdentifier changes. Immediate on SPL changes (user is editing the query, highlights should track).

### Modified files

| File | Change |
|------|--------|
| `src/hooks/useInjectionMarkers.ts` | New — match logic + Ace marker generation |
| `src/features/query/QuerySection.tsx` | Add `useInjectionMarkers`, apply markers to editor, render match badge, remove linter marker application and Hide Notes button |
| `src/features/query/splLinter.ts` | No change (still exports `lintSpl`), but its markers are no longer applied to the editor |
| `src/features/query/useAceMarkers.ts` | Currently applies linter markers. Will be repurposed to apply only injection markers. The `mergedWarnings` memo in QuerySection (line 89) that combines `splWarnings + analysisNotes + activeFields` will be replaced with injection markers only. |
| `src/features/scenarios/DataSourceSelector.tsx` | Add "INJECT INTO" label, new help text, inline match indicator |
| `src/features/scenarios/InputCard.tsx` | Pass match count to DataSourceSelector (or DataSourceSelector reads from store) |
| `src/features/tutorial/tutorialSteps.ts` | Update "row-identifier" and "row-id-value" step text |
| `src/globals.css` | Add `.ace_injection-match` class for amber underline + background |

### CSS class

```css
.ace_injection-match {
    border-bottom: 2px solid rgba(245, 158, 11, 0.5);
    background: rgba(245, 158, 11, 0.08);
    position: absolute;
}
```

### Store changes

None. The injection markers are derived state (computed from `rowIdentifier` values + SPL text). No new store slices or actions needed. The hook reads existing state via selectors.

## What's NOT in scope

- Showing the "after" injected SPL (the replacement text) — too complex for now, just show what matches
- Per-input color coding (different colors per input) — all inputs use amber; revisit if users have 3+ inputs
- Injection preview for JSON or Query Data input modes — only applies to the rowIdentifier field
- Any changes to the results section or how linter warnings display there
