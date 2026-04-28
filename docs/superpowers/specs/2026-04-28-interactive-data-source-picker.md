# Interactive Data Source Picker — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Inject Into" text field with an interactive query sidebar where users click on data sources directly in their SPL to configure test data injection.

**Architecture:** The query sidebar on the Data step becomes interactive — AI-highlighted data sources are clickable. Clicking one creates a pre-filled input card on the right. Hovering shows injection status. The row identifier concept becomes invisible to users.

**Constraints:** React 16.13, Zustand v4 default import, Tailwind CSS 3, no `?.`/`??`, Python 3.7 backend unchanged.

---

## 1. The Flow

### Step 1: Query
User writes SPL as usual. Clicks Next.

### Step 2: Data (redesigned)

**On arrival:**
- The "Next" chevron triggers `extractDataSources()` (already implemented — auto-fires on Query→Data transition).
- The sidebar renders the query with **AI-extracted data sources highlighted** — each source gets a subtle underline and slightly brighter text, like clickable links.
- The right side shows a prompt card: *"Click a data source in your query to add test data."* with a subtle arrow pointing left toward the sidebar.

**Interaction — clicking a source:**
- User clicks a highlighted source in the sidebar (e.g., `index=main sourcetype=access`).
- The source highlights in a solid accent color (amber, matching existing injection markers).
- An input card instantly appears on the right, pre-filled:
  - Row identifier = the clicked text (set automatically, not editable inline — but shown as a label).
  - Fields = the extracted fields for that data source (from the LLM result).
  - Mode = "fields" by default.
  - One empty event with the extracted field names pre-populated.
- The sidebar source now shows a small colored dot (configured indicator).

**Interaction — hovering a source:**
- **Unconfigured source** (highlighted but not clicked): tooltip says *"Click to add test data"*.
- **Configured source** (already has an input card): tooltip shows *"2 events, 5 fields — click to scroll to card"*.
- **Clicking a configured source** scrolls to its input card on the right and briefly highlights it.

**Interaction — multiple sources:**
- Each clicked source gets its own input card.
- Sources are color-coded (same per-input color scheme as existing injection markers — amber, blue, green, etc.).
- The sidebar shows each source in its assigned color.

**Interaction — custom source (edge case):**
- If the AI missed a source, user can **click-drag to select custom text** in the sidebar.
- A small "Add as data source" button appears above the selection.
- Clicking it creates an input card with that text as the row identifier.

**Interaction — removing a source:**
- Deleting an input card on the right also deselects the source in the sidebar (returns to "clickable but unconfigured" state).

### Step 3: Validation
Unchanged.

---

## 2. What Gets Removed

- **"Inject Into" text field** in InputCard — replaced by an editable colored badge. Pre-filled by clicking the sidebar, but always manually editable.
- **DataSourceSelector dropdown** — gone. The sidebar IS the selector. The badge is the editor.
- **ExtractFieldsButton** — already removed from ScenarioPanel. The extraction happens automatically on Next.
- The row identifier label still shows at the top of each input card as a read-only colored badge (so users know which source this card is for).

---

## 3. Sidebar Changes (QuerySidebar.tsx)

### Current state
Read-only SPL display with syntax highlighting + injection range overlays. Not interactive.

### New state
- Receives `extractedDataSources` from the store (already available on `test.fieldExtraction.sources`).
- Each source's `rowIdentifier` text is wrapped in a clickable `<span>` with:
  - Default: subtle underline + slightly brighter text (`text-slate-200` instead of `text-slate-300`).
  - Hover: background tint + cursor pointer + tooltip.
  - Active (has input card): solid accent color background (per-input color) + small dot indicator.
- Click handler calls a new store action: `selectDataSourceFromSidebar(testId, scenarioId, rowIdentifier, fields)`.
- The SPL rendering pipeline: tokenize → syntax highlight → overlay data source spans → overlay injection ranges.

### Text selection for custom sources
- `onMouseUp` handler on the sidebar `<pre>` element.
- If the user has selected text (via `window.getSelection()`), show a small floating "Add as data source" button above the selection.
- Clicking the button extracts the selected text and calls the same store action.

---

## 4. Data Step Right Side Changes

### Empty state (no sources selected yet)
Shows a prompt card:
```
  ← Click a data source in your query to start

  Your query has N data sources detected.
  Click one in the sidebar to define test data for it.
```

### After sources are selected
- Each selected source becomes a **Scenario input card** (existing InputCard component).
- The "Inject Into" dropdown is replaced by an **editable colored badge** at the top: `index=main sourcetype=access` in the source's accent color.
- The badge is **click-to-edit** — clicking it turns it into a text input pre-filled with the current value. The user can narrow or widen the match (e.g., add `host=*sh01*` to be more specific).
- Below the editable badge, a short helper line explains the scope: *"All occurrences of this exact text in your query will be replaced with test data."*
- When the badge text changes, the sidebar updates its highlight to match — giving instant visual feedback of what will be replaced.
- A small "×" on the badge removes the source entirely (deselects it from the sidebar).
- Everything below the badge is unchanged: mode tabs, field editor, JSON editor, event generator.

### Why editability matters — orphaned filter warning

This is the **most critical UX problem** to solve. Users must understand what stays and what gets replaced.

When a row identifier is selected, the sidebar shows **two highlights**:

1. **Amber/green (replaced):** the selected row identifier text — this gets swapped with the temp index.
2. **Red/warning (orphaned):** any remaining `key=value` filters in the same search clause that are NOT part of the row identifier.

**Example:** Query is `index=_internal host=*sh01* source=/var/log | stats count`

- User selects `index=_internal` as the row identifier.
- Sidebar shows:
  - `index=_internal` → **amber** (will be replaced with temp index)
  - `host=*sh01* source=/var/log` → **red underline** with warning icon
- Below the red filters, a tooltip/message: *"These filters will stay in the query but won't match your test data. Include them in the data source to avoid zero results, or make sure your test events have matching values."*

- User expands the badge to `index=_internal host=*sh01* source=/var/log`
- Sidebar updates: everything is **amber** now (all replaced). Red warning disappears.

This makes the consequence of the choice immediately visible. The user sees red = danger, expands their selection, red goes away.

**The orphaned filter detection already exists** in the backend (`check_orphaned_filters` in `query_injector.py`). The frontend version uses the same logic: after the row identifier is set, scan the same search clause (before the first `|`) for `key=value` patterns not covered by the row identifier. Any leftover = red warning.

---

## 5. Hover Tooltips on Sidebar

Small floating tooltip that appears on hover over a data source span:

**Unconfigured:**
```
Click to add test data
Fields: status, src_ip, action
```

**Configured:**
```
2 events, 5 fields defined
Click to scroll to input card
```

The tooltip uses the existing navy-800 card style, positioned to the right of the hovered text (using the same positioning logic as tutorial tooltips).

---

## 6. Store Changes

### New actions
- `selectDataSourceFromSidebar(testId, scenarioId, rowIdentifier, fields)` — creates a new input in the scenario with the row identifier pre-filled, fields pre-populated, mode set to "fields".
- `removeDataSourceFromSidebar(testId, scenarioId, inputId)` — removes the input and clears the sidebar highlight.

### Existing changes
- `InputCard` no longer renders `DataSourceSelector` when the row identifier was set via sidebar (detected by a new flag `sourceSelectedFromSidebar: boolean` on `TestInput`).
- Fallback: if `fieldExtraction` is empty (no LLM configured), the old `DataSourceSelector` text field still works as a fallback.

---

## 7. Backward Compatibility

- Tests created before this change still work — they have `rowIdentifier` set manually. The InputCard still shows the read-only badge for these.
- If no LLM is configured (no endpoint/key), the sidebar shows plain SPL without clickable sources. The old DataSourceSelector text field appears as fallback in InputCard.
- The `rowIdentifier` field on `TestInput` is unchanged — it's just set via a different UI path.

---

## 8. What Stays the Same

- Backend injection logic — unchanged. `query_injector.py` still does find-and-replace with the row identifier.
- The `extractDataSources` LLM call — unchanged. Already returns the right data.
- The query sidebar's syntax highlighting, resize, collapse — all unchanged.
- Validation step — unchanged.
- Results bar — unchanged.
- The "full base search" variant (added earlier today) — still generated as an additional option.

---

## 9. Injection Preview

Below the input cards on the Data step, a collapsible **"Preview injected query"** section shows the final SPL with all replacements applied — the actual query that will run against Splunk. This closes the loop: the user sees their original query, their data sources highlighted, AND the resulting injected query.

- Collapsed by default (just a "Preview injected query ▸" link).
- When expanded, shows the full SPL with temp index replacements rendered inline.
- Updates live as the user edits badges or adds/removes sources.
- Uses the same syntax highlighting as the sidebar.

---

## 10. Match Count Indicator

Each data source badge on the input card shows how many times that text appears in the query:

- `index=main sourcetype=access` **×3** — appears in outer query + 2 subsearches. All 3 will be replaced.
- `index=other` **×1** — appears once.

This helps users understand the blast radius of their selection. Shown as a small muted `×N` next to the badge.

---

## 11. Strategy-Specific Source Highlighting

The sidebar needs to handle different query types correctly:

| Strategy | What gets highlighted as clickable |
|----------|-----------------------------------|
| standard | `index=X sourcetype=Y ...` clause (before first pipe) |
| inputlookup | `\| inputlookup filename.csv` (entire command) |
| rest | `\| rest /services/...` (entire rest clause up to next pipe) |
| tstats | `index=X` inside the `where` clause |
| lookup | The lookup table name only (e.g., `users_list` in `\| lookup users_list`) |
| no_index | No sources to highlight — sidebar shows "This query has no data source. Test data will be prepended." |
| Subsearches | Each `[search index=X ...]` highlighted independently within its brackets |

For `inputlookup` and `rest`, the entire command is one clickable block. The user clicks the whole thing, not individual tokens within it.

---

## 12. Phase 1 Fixes (from user testing)

These must be addressed before Phase 2:

### Fix 1: Use existing empty input instead of creating new one
When clicking a data source in the sidebar, if the current scenario already has an empty Input 1 (no row identifier, no data), **fill it** instead of adding a new input. Only create a new input if all existing inputs already have data.

### Fix 2: Recognize non-index commands as data sources
The interactive sidebar must highlight ALL supported injection strategies, not just `index=`:
- `| inputlookup <file>` — highlight the entire command as one clickable block
- `| rest <endpoint>` — highlight entire rest clause
- `` `cache(lookup, ...)` `` — highlight cache macro calls
- `| tstats ... where index=X` — highlight the index in the where clause
- `| lookup <table>` — highlight the lookup table name

The `useSourceSpans` hook currently only matches text from LLM extraction. It should ALSO do a regex scan for these patterns as a fallback (in case LLM misses them or no LLM is configured).

### Fix 3: Make clickable sources more obvious
The current subtle underline is not obvious enough. Improve:
- Add a small hover tooltip: "Click to inject test data here"
- On the Data step, show a brief one-time pulse animation on all clickable sources when the step first loads (similar to chevron attention animation)
- Consider a small "click" cursor icon or a dotted border instead of just an underline

### Fix 4: Data source marking on Query step
Users want to see and interact with data sources on the Query step too — not just the Data step. Options:
- Show data sources as highlighted spans in the query editor (read-only markers, like the existing injection markers)
- After "Analyze Query" runs, mark the detected sources in the editor gutter or as inline decorations
- This is a preview — clicking them on the Query step doesn't create inputs (that happens on Data step), but it shows users "these are the parts that will be replaced"

---

## 13. Edge Cases

- **No LLM configured:** Sidebar is not interactive. Old DataSourceSelector text field appears in InputCard as fallback. The editable badge still works — users can type manually.
- **LLM returns no sources:** Sidebar shows a small message below the query: "No data sources detected — select text manually." The drag-select flow still works.
- **User selects text that doesn't match any extraction:** Works fine — custom text becomes the row identifier.
- **tstats/rest/inputlookup queries:** See strategy table in section 11.
- **Subsearches:** Each subsearch has its own data source. The sidebar highlights each one independently with its own color.
- **query_only mode:** Data step is skipped entirely. No sidebar interaction needed.
- **Same index in outer + subsearch:** Both highlighted as one source (same text = same replacement). Match count shows ×N.
- **Different indexes in outer + subsearch:** Highlighted as separate sources, different colors, different input cards.
- **Collapsed sidebar:** If sidebar is collapsed when landing on Data step, auto-expand it (the sources need to be visible). Show a brief pulse animation on the sidebar to draw attention.
