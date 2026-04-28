# Builder Wizard Redesign — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 3-panel horizontal builder layout with a wizard stepper (Query → Data → Validation) plus a resizable, collapsible query sidebar — reducing cognitive overload while keeping the query always accessible.

**Architecture:** The `StartPage` component switches from rendering three horizontal panels to a wizard layout: a stepper bar at the top, a persistent query sidebar on the left, and a single active step content area on the right. Navigation is via Next/Back buttons and clickable stepper nodes. The results bar stays as-is (bottom pop-up).

**Constraints:** React 16.13 (no useId, useTransition, etc.), Zustand v4 default import, Tailwind CSS 3, no `?.`/`??` (ES5-compatible), Python 3.7 backend unchanged, all audit rules from `splunk-query-tester-audit` apply post-implementation.

---

## 1. Wizard Stepper

### Steps

| Step | Label | Content component | Entry condition |
|------|-------|-------------------|-----------------|
| 1 | Query | `QuerySection` (existing) | App selected |
| 2 | Data | `ScenarioPanel` (existing) | Query entered, standard test type |
| 3 | Validation | `ValidationSection` (existing) | At least one scenario with inputs |

For `query_only` mode (Real Data), Step 2 (Data) is skipped entirely — the stepper shows Query → Validation (2 steps).

### Stepper Bar

- Horizontal bar at the top of the builder area, below the TopBar/setup controls.
- Each step shows: numbered circle + label.
- States: completed (green checkmark), active (blue-300 filled), upcoming (slate-700 dim).
- Completed steps are clickable — user can jump back to any completed step.
- Cannot jump forward past the current step (no skipping).

### Navigation

- **Next button** at the bottom-right of each step's content area. Label shows next step: "Next: Data →", "Next: Validation →".
- **Back button** at the bottom-left. Label shows previous step: "← Back to Query".
- Step 3 has a green **Run Test** button instead of Next (the existing run action).
- Keyboard: no keyboard shortcuts for step navigation (avoid conflicts with the Ace editor).

### Auto Extract Fields on Query → Data Transition

When the user clicks "Next" from Step 1 to Step 2:
1. Check if the query has changed since the last Extract Fields call (compare SPL text).
2. If changed (or never run), fire `extractFields()` in the background.
3. If already extracted and SPL unchanged, skip.
4. If LLM is not configured (no endpoint/key in admin Setup), skip silently.
5. If extraction fails, show a small toast warning but still navigate to Step 2.

This uses the existing `extractFields` store action — no new backend work needed.

---

## 2. Query Sidebar

### Expanded State (default)

- Left sidebar panel, default width ~280px.
- **Resizable** via a drag handle (6px vertical bar between sidebar and content). Min width: 180px, max width: 50% of container.
- Background: `navy-800` (`#202b43`), border: `slate-700` (`#334155`).

**Contents (top to bottom):**
1. **Header row:** "Query" label + "edit" link (jumps to Step 1) + collapse button (`«`).
2. **SPL code block:** Read-only monospace display of the current SPL. Syntax-highlighted (index/commands in blue-300). Shows injection markers (row identifier highlights, same colors as today via `useInjectionMarkers`).
3. **Metadata section** (below a divider):
   - Saved search name (if `savedSearchOrigin` is set)
   - Time range
   - Field tags — extracted field names as small badges (`font-family: monospace`, blue-300 text on navy-900 bg). These come from the `extractedFields` store state.

**"Edit" link behavior:** Clicking "edit" navigates to Step 1 (Query) and focuses the Ace editor. The sidebar stays expanded. When on Step 1, the sidebar content is hidden (redundant — the full editor is the active content). The sidebar reappears when navigating to Step 2 or 3.

### Collapsed State

- Width: 40px. Shows a vertical "QUERY" text label (rotated) and an expand button (`»`).
- Clicking `»` or the vertical text expands back to the last drag-set width.
- Collapse/expand state persisted to localStorage (key: `qt_query_sidebar_collapsed`).

### When on Step 1 (Query)

The sidebar is **not shown** — the query editor IS the active content and takes full width. The sidebar only appears on Steps 2 and 3.

---

## 3. Active Step Content Area

- Takes all remaining horizontal space (container width minus sidebar width).
- Each step renders its existing component at full width:
  - Step 1: `QuerySection` (full width, no sidebar)
  - Step 2: `ScenarioPanel` (full width minus sidebar)
  - Step 3: `ValidationSection` (full width minus sidebar)
- The existing components are mostly unchanged — they just get more horizontal space than before.

---

## 4. Results Bar

**No changes.** The results bar stays as the bottom pop-up panel, exactly as today:
- Collapsed: thin bar showing last run status.
- Expanded: full results with scenario cards, validation items, result rows table.
- Can be expanded/collapsed from any wizard step.
- The Run button in Step 3 triggers the run and auto-expands the results bar.

---

## 5. State Management

### New State (in `panelSlice` or new `wizardSlice`)

```typescript
// New wizard state
activeStep: number;              // 0, 1, 2 (Query, Data, Validation)
querySidebarCollapsed: boolean;  // persisted to localStorage
querySidebarWidth: number;       // persisted to localStorage, default 280
lastExtractedSpl: string;        // SPL text when Extract Fields last ran
```

### Removed State

- `panelViewMode` ('all' | 'single') — replaced by wizard flow
- `activePanelIndex` — replaced by `activeStep`
- `collapsedPanels` record — replaced by single `querySidebarCollapsed`

### Step Transition Logic

```
canGoToStep(step):
  step 0 (Query):     always true (if app selected)
  step 1 (Data):      hasQuery && isStandard
  step 2 (Validation): hasQuery && (isQueryOnly || hasScenarios)

goToNext():
  if activeStep == 0 and isQueryOnly:
    jump to step 2 (skip Data)
  else:
    activeStep += 1
  if transitioning from 0 to 1:
    maybeExtractFields()

goToBack():
  if activeStep == 2 and isQueryOnly:
    jump to step 0 (skip Data)
  else:
    activeStep -= 1
```

---

## 6. Layout Structure (JSX outline)

```
<div class="builder-container flex flex-col h-full">
  {/* Setup bar: test name, app selector, mode selector — same as today */}
  <SetupBar />

  {/* Stepper bar */}
  <WizardStepper activeStep={activeStep} steps={steps} onStepClick={goToStep} />

  {/* Main content area */}
  <div class="flex flex-1 min-h-0">
    {/* Query sidebar — hidden on Step 1 */}
    {activeStep > 0 && (
      <QuerySidebar
        collapsed={querySidebarCollapsed}
        width={querySidebarWidth}
        onToggle={toggleSidebar}
        onResize={setSidebarWidth}
        onEditClick={() => setActiveStep(0)}
      />
    )}

    {/* Active step content — full width on Step 1 */}
    <div class="flex-1 min-w-0">
      {activeStep === 0 && <QuerySection />}
      {activeStep === 1 && <ScenarioPanel />}
      {activeStep === 2 && <ValidationSection />}

      {/* Navigation buttons */}
      <WizardNavigation
        activeStep={activeStep}
        onNext={goToNext}
        onBack={goToBack}
        onRun={runTest}
      />
    </div>
  </div>

  {/* Results bar — unchanged */}
  <ResultsBar />
</div>
```

---

## 7. New Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `WizardStepper` | `src/features/layout/WizardStepper.tsx` | Stepper bar with numbered circles, labels, click navigation |
| `WizardNavigation` | `src/features/layout/WizardNavigation.tsx` | Next/Back/Run buttons at bottom of content area |
| `QuerySidebar` | `src/features/layout/QuerySidebar.tsx` | Resizable sidebar with SPL display, metadata, collapse toggle |
| `QuerySidebarCollapsed` | `src/features/layout/QuerySidebarCollapsed.tsx` | Thin 40px collapsed strip |

### Modified Components

| Component | Changes |
|-----------|---------|
| `StartPage.tsx` | Replace 3-panel horizontal layout with wizard + sidebar layout |
| `panelSlice.ts` | Replace panel state with wizard state (activeStep, sidebar) |
| `QuerySection.tsx` | No structural changes — just renders at full width now |
| `ScenarioPanel.tsx` | No structural changes — renders at full width |
| `ValidationSection.tsx` | No structural changes — renders at full width |
| `ViewModeToggle` | Remove — no longer needed (All/Focus toggle) |

---

## 8. Injection Markers in Sidebar

The `useInjectionMarkers` hook currently returns Ace editor marker objects. For the sidebar (read-only SPL display), we need a simpler approach:

- The sidebar renders SPL as HTML `<span>` elements.
- Use the same row-identifier matching logic from `useInjectionMarkers` to wrap matched text in colored `<span>` elements with the per-input color index.
- Extract the matching logic into a shared utility (`getInjectionRanges(spl, inputs)`) that returns `{start, end, colorIndex}[]` — usable by both the Ace markers hook and the sidebar renderer.

---

## 9. Persistence

| Key | Storage | Default | Purpose |
|-----|---------|---------|---------|
| `qt_query_sidebar_collapsed` | localStorage | `false` | Sidebar collapsed state |
| `qt_query_sidebar_width` | localStorage | `280` | Last drag-set width in px |
| `qt_panel_view_mode` | localStorage | Remove | No longer used |

---

## 10. What Stays the Same

- **TopBar / navigation** — unchanged
- **Library page** — unchanged
- **Setup page** — unchanged
- **App/mode selectors** — same controls, same position in setup bar
- **Results bar** — same bottom pop-up behavior
- **All existing components** (QuerySection, ScenarioPanel, ValidationSection) — internal logic unchanged, they just get more width
- **Backend** — no Python changes
- **LLM config** — still via admin Setup page
- **IDE mode** — stays as-is (separate layout, not affected by this redesign)

---

## 11. Edge Cases

- **query_only mode:** Step 2 (Data) is skipped. Stepper shows 2 steps: Query → Validation. Sidebar still shows query on Step 2 (Validation).
- **No app selected:** Show `SetupCard` (same as today). Wizard doesn't render until app is chosen.
- **Narrow screens (<1024px):** Sidebar auto-collapses. Content gets full width.
- **Browser refresh:** `activeStep` resets to 0 (Query). Sidebar state restored from localStorage.
- **Saved test load:** After loading, activeStep stays at 0 (Query) so user reviews the loaded SPL first.

---

## 12. Audit Compliance

All implementation must pass the `splunk-query-tester-audit` skill checks:
- React 16 only — no banned APIs
- No `?.` or `??` — use explicit null checks (`x && x.prop`, `x || default`)
- Zustand v4 default import (`import create from 'zustand'`)
- No `any` types — proper TypeScript typing
- Named Props interfaces for all components
- Files under 200 lines
- No console.log
- No API calls inside components
- Run `npx tsc --noEmit` and `yarn build` clean before done
