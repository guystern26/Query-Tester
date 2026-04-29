# Sources Step — Design Spec

**Date:** 2026-04-28
**Status:** Approved
**Goal:** Add a dedicated "Sources" wizard step between Query and Data where users explicitly mark which parts of their SPL are injection targets. Replaces the current approach of cramming interactivity into the query sidebar.

---

## Problem

The current flow asks users to click parts of their query inside a narrow sidebar on the Data step. This is unintuitive — the sidebar looks like a read-only reference, the dotted underlines are too subtle, and users don't realize they're supposed to interact with it. A dedicated step makes the action explicit: "look at your query, mark your data sources."

---

## Wizard Flow

Standard tests become 4 steps:

**Query → Sources → Data → Validation**

Query-only tests remain 2 steps (Query → Validation) — they skip Sources and Data entirely, same as today.

---

## Sources Step Layout

Full-width content card (no sidebar) with two zones:

### Top Zone (~70%): SPL Display

- Full query rendered in a large, readable `<pre>` block with syntax highlighting (reuse `renderHighlightedSpl` from `splHighlight.tsx`)
- AI-detected sources pre-highlighted with colored dotted underlines (same `SOURCE_COLORS` palette)
- Regex fallback patterns (`inputlookup`, `rest`, `cache()`, `lookup`) also highlighted in non-LLM environments
- **Click a highlighted source** to dismiss it (toggle off — removes from confirmed list, underline reverts to plain text)
- **Drag-select arbitrary text** to add a custom source (reuse existing drag-select logic from `InteractiveSidebar`)
- Each source gets a unique color from `SOURCE_COLORS`
- Hover shows `SourceTooltip` with field list and status

### Bottom Zone (~30%): Confirmed Sources Strip

- Horizontal list of confirmed source chips, each showing:
  - Colored dot + row identifier text (mono font, truncated if long)
  - Field names as small tags (if detected by LLM)
  - `×` button to remove
- "+ Add manually" button at the end — opens a small inline text input for typing a custom source
- Empty state: "No sources selected — click highlighted text above or add manually"

---

## Interaction Flow

1. User clicks Next from Query step
2. `fetchExtractDataSources` fires (already exists — moves from Data step transition to Query→Sources transition)
3. Detected sources appear pre-highlighted in the SPL display
4. Each detected source auto-appears as a chip in the confirmed strip
5. User reviews: dismiss unwanted sources (click to toggle off), drag-select to add custom ones, or add manually via text input
6. User clicks Next to advance to Data step
7. Each confirmed source creates an Input card via `addInputFromSource` (reuses empty inputs first)

---

## Step Transition Logic

### Query → Sources
- Fires `fetchExtractDataSources` (moved from the current Query→Data transition in `WizardLayout.handleNext`)
- Populates `confirmedSources` from the extraction result
- Regex fallback patterns also scanned and added

### Sources → Data
- For each confirmed source, calls `addInputFromSource(testId, scenarioId, ri, fields)`
- The existing empty-input-reuse logic (Task 1 fix) applies — fills empty inputs before creating new ones
- Sources that were removed from the confirmed list: their corresponding input cards are NOT auto-deleted (user may have data in them). They just won't have new ones created.

### Data → Sources (going back)
- Inputs are preserved
- Confirmed sources list is re-derived from existing input row identifiers + any LLM/regex detections
- User can add/remove sources; going forward again re-syncs inputs

---

## Store Changes

### `wizardSlice.ts` — new state

```typescript
confirmedSources: Array<{
    rowIdentifier: string;
    fields: string[];
    colorIndex: number;
}>
```

### New actions (in `wizardSlice.ts`)

- `setConfirmedSources(sources)` — bulk set from extraction results
- `addConfirmedSource(rowIdentifier, fields)` — add a manual/drag-selected source
- `removeConfirmedSource(rowIdentifier)` — dismiss a source
- `clearConfirmedSources()` — reset on wizard reset

### `storeTypes.ts`

Add the new action signatures to `WizardSliceState`.

---

## Data Step Changes

### Sidebar becomes read-only
- `QuerySidebar.tsx` loses the `interactive` and `onSourceClick` props
- Always renders the passive view: syntax-highlighted SPL + metadata (time range, fields, saved search origin)
- No clickable spans, no drag-select, no tooltips on the Data step

### Empty state
- Changes from "Click a data source in the query sidebar" to "No inputs yet — go back to Sources to add data sources"
- The "+ Add Input Manually" button remains as fallback

---

## File Structure

### New files
| File | Responsibility |
|------|----------------|
| `src/features/sources/SourcesStep.tsx` | Main component — SPL display + confirmed strip |
| `src/features/sources/SourceChip.tsx` | Single confirmed source chip (dot, text, fields, remove) |
| `src/features/sources/useConfirmedSources.ts` | Hook managing confirmed/dismissed state, sync with store |

### Modified files
| File | Changes |
|------|---------|
| `WizardLayout.tsx` | 4th step in `stepDefs`, render `SourcesStep` when `currentStepId === 'sources'`, move extraction trigger to Query→Sources transition |
| `wizardSlice.ts` | Add `confirmedSources` state + actions |
| `storeTypes.ts` | Add new action types to `WizardSliceState` |
| `QuerySidebar.tsx` | Remove `interactive` and `onSourceClick` props — always passive |
| `ScenarioPanel.tsx` | Update empty state text |

### Reused files (relocated from sidebar to SourcesStep)
| File | Change |
|------|--------|
| `InteractiveSidebar.tsx` | Reused inside `SourcesStep` for the clickable SPL display |
| `interactiveSidebarHelpers.tsx` | Render helpers used by SourcesStep |
| `SourceTooltip.tsx` | Hover tooltips on the Sources step |

### Unchanged
| File | Why |
|------|-----|
| `SourceBadge.tsx` | Stays on input cards in the Data step — still editable |
| `DataSourceSelector.tsx` | Fallback for no-source inputs |
| `InjectionPreview.tsx` | Stays on Data step |
| `useSourceSpans.ts` | Used by SourcesStep for span detection |
| `useOrphanedFilters.ts` | Used by SourceBadge |
| `inputSlice.ts` | `addInputFromSource` unchanged |

---

## What Gets Removed

- `QuerySidebar.interactive` prop and `onSourceClick` prop
- The `handleSourceClick` callback in `WizardLayout.tsx`
- The auto-expand sidebar effect on Data step (no longer needed — sidebar is always passive)
- The empty state "Click a data source in the query sidebar" arrow icon

---

## Not In Scope

- Reordering sources
- Grouping sources by type (index vs inputlookup vs rest)
- Source-level validation configuration
- Editing sources inline in the strip (use the SourceBadge on the Data step for that)

---

## Success Criteria

1. User can see their full query with highlighted sources on the Sources step
2. AI-detected sources appear pre-confirmed with one click to dismiss
3. User can drag-select custom text to add sources the AI missed
4. Advancing to Data auto-creates input cards for each confirmed source
5. Going back to Sources preserves existing inputs
6. Data step sidebar is a clean read-only reference
7. The whole flow feels like a natural progression: write query → mark targets → fill test data → set expectations
