# Wizard Builder Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-panel horizontal builder with a wizard stepper (Query → Data → Validation) plus a resizable, collapsible query sidebar.

**Architecture:** `panelSlice` is rewritten as `wizardSlice` with `activeStep`, sidebar state, and `lastExtractedSpl`. `BuilderPanels` is replaced by a `WizardLayout` that renders a stepper bar, optional sidebar, and one active step at a time. Existing content components (`QuerySection`, `ScenarioPanel`, `ValidationSection`) are reused unchanged.

**Tech Stack:** React 16.13, Zustand v4 (default import), Tailwind CSS 3, TypeScript (no `?.`/`??`)

**Constraints:** No `any` types. Named Props interfaces. Files under 200 lines. No React 18 APIs. `import create from 'zustand'` only. No `console.log`. Run `npx tsc --noEmit` and `yarn build` clean before done.

---

## File Structure

### New files
| File | Responsibility |
|------|----------------|
| `src/core/store/slices/wizardSlice.ts` | Wizard state: activeStep, sidebar collapsed/width, lastExtractedSpl, navigation actions |
| `src/features/layout/WizardStepper.tsx` | Stepper bar (numbered circles, labels, click navigation) |
| `src/features/layout/WizardNavigation.tsx` | Next/Back/Run buttons at bottom of content area |
| `src/features/layout/QuerySidebar.tsx` | Resizable sidebar with SPL display, metadata, collapse toggle |
| `src/features/layout/WizardLayout.tsx` | Orchestrator: stepper + sidebar + active step content |
| `src/hooks/useInjectionRanges.ts` | Shared injection matching logic (character ranges, no Ace dependency) |

### Modified files
| File | Changes |
|------|---------|
| `src/core/store/slices/panelSlice.ts` | Delete entirely — replaced by `wizardSlice.ts` |
| `src/core/store/storeTypes.ts` | Replace `PanelSliceState` with `WizardSliceState` |
| `src/core/store/testStore.ts` | Swap `panelSlice` import for `wizardSlice` |
| `src/StartPage.tsx` | Replace `BuilderPanels` with `WizardLayout` |
| `src/hooks/useInjectionMarkers.ts` | Refactor to use shared `useInjectionRanges` |

### Deleted files
| File | Reason |
|------|--------|
| `src/features/layout/BuilderPanels.tsx` | Replaced by `WizardLayout` |
| `src/features/layout/ViewModeToggle.tsx` | No longer needed (All/Focus toggle) |

### Kept unchanged
| File | Why |
|------|-----|
| `src/features/query/QuerySection.tsx` | Renders at full width — no changes needed |
| `src/features/scenarios/ScenarioPanel.tsx` | Renders at full width — no changes needed |
| `src/features/validation/ValidationSection.tsx` | Renders at full width — no changes needed |
| `src/features/results/ResultsBar.tsx` | Bottom pop-up stays as-is |
| `src/features/layout/StepPipeline.tsx` | Kept for reference but no longer rendered in builder |
| `src/features/layout/usePipelineState.ts` | Kept — `WizardStepper` reuses its step logic |

---

## Task 1: Create `wizardSlice` (replace `panelSlice`)

**Files:**
- Create: `packages/query-tester-app/src/core/store/slices/wizardSlice.ts`
- Modify: `packages/query-tester-app/src/core/store/storeTypes.ts`
- Modify: `packages/query-tester-app/src/core/store/testStore.ts`

- [ ] **Step 1: Create `wizardSlice.ts`**

```typescript
/**
 * Wizard slice — step navigation, query sidebar state.
 * Replaces panelSlice. Persists sidebar state to localStorage.
 */

const LS_COLLAPSED = 'qt_query_sidebar_collapsed';
const LS_WIDTH = 'qt_query_sidebar_width';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 180;

function loadCollapsed(): boolean {
    try { return localStorage.getItem(LS_COLLAPSED) === 'true'; } catch { return false; }
}

function loadWidth(): number {
    try {
        const v = parseInt(localStorage.getItem(LS_WIDTH) || '', 10);
        return v >= MIN_WIDTH ? v : DEFAULT_WIDTH;
    } catch { return DEFAULT_WIDTH; }
}

export interface WizardSliceState {
    activeStep: number;
    querySidebarCollapsed: boolean;
    querySidebarWidth: number;
    lastExtractedSpl: string;
}

export const wizardInitialState: WizardSliceState = {
    activeStep: 0,
    querySidebarCollapsed: loadCollapsed(),
    querySidebarWidth: loadWidth(),
    lastExtractedSpl: '',
};

type SetState = (recipe: (draft: WizardSliceState) => void) => void;

export function wizardSlice(set: SetState) {
    return {
        setActiveStep: (step: number): void => {
            set((d) => { d.activeStep = step; });
        },
        toggleQuerySidebar: (): void => {
            set((d) => {
                d.querySidebarCollapsed = !d.querySidebarCollapsed;
            });
            try {
                const current = loadCollapsed();
                localStorage.setItem(LS_COLLAPSED, String(!current));
            } catch { /* ignore */ }
        },
        setQuerySidebarWidth: (width: number): void => {
            const clamped = Math.max(MIN_WIDTH, width);
            set((d) => { d.querySidebarWidth = clamped; });
            try { localStorage.setItem(LS_WIDTH, String(clamped)); } catch { /* ignore */ }
        },
        setLastExtractedSpl: (spl: string): void => {
            set((d) => { d.lastExtractedSpl = spl; });
        },
    };
}
```

- [ ] **Step 2: Update `storeTypes.ts` — replace PanelSliceState with WizardSliceState**

Replace the `PanelSliceState` import and usage:

```typescript
// Remove this line:
import type { PanelSliceState, PanelViewMode, PanelId } from './slices/panelSlice';

// Add this line:
import type { WizardSliceState } from './slices/wizardSlice';

// Change the interface extends:
// FROM: export interface TestStoreState extends IdeSliceState, ChatSliceState, PanelSliceState {
// TO:
export interface TestStoreState extends IdeSliceState, ChatSliceState, WizardSliceState {
```

Also add the new action signatures to `TestStoreState`:

```typescript
    // --- Wizard ---
    setActiveStep: (step: number) => void;
    toggleQuerySidebar: () => void;
    setQuerySidebarWidth: (width: number) => void;
    setLastExtractedSpl: (spl: string) => void;
```

And remove the old panel action signatures:

```typescript
    // REMOVE these:
    setPanelViewMode: (mode: PanelViewMode) => void;
    setActivePanelIndex: (index: number) => void;
    togglePanelCollapsed: (panel: PanelId) => void;
```

- [ ] **Step 3: Update `testStore.ts` — swap panelSlice for wizardSlice**

```typescript
// Remove:
import { panelSlice, panelInitialState } from './slices/panelSlice';

// Add:
import { wizardSlice, wizardInitialState } from './slices/wizardSlice';

// In the create() body, replace:
//   ...panelInitialState,
//   ...panelSlice(set),
// With:
        ...wizardInitialState,
        ...wizardSlice(set),
```

- [ ] **Step 4: Delete `panelSlice.ts`**

Delete `packages/query-tester-app/src/core/store/slices/panelSlice.ts`.

- [ ] **Step 5: Fix any remaining imports of panelSlice**

Search for `panelSlice` or `PanelViewMode` or `PanelId` or `collapsedPanels` or `panelViewMode` across `src/`. Update or remove each reference. Known references:
- `BuilderPanels.tsx` — will be deleted in Task 5
- `ViewModeToggle.tsx` — will be deleted in Task 5

For now, comment out or stub any broken imports so `tsc` passes. They'll be properly resolved when those files are deleted.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors (or only errors from files that will be deleted in later tasks)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace panelSlice with wizardSlice for wizard builder"
```

---

## Task 2: Create `useInjectionRanges` (shared matching logic)

**Files:**
- Create: `packages/query-tester-app/src/hooks/useInjectionRanges.ts`
- Modify: `packages/query-tester-app/src/hooks/useInjectionMarkers.ts`

- [ ] **Step 1: Create `useInjectionRanges.ts`**

Extract the pure matching logic from `useInjectionMarkers` into a reusable hook that returns character ranges (no Ace dependency):

```typescript
/**
 * useInjectionRanges — derives character-level injection match ranges.
 * Shared by both the Ace editor markers and the sidebar HTML renderer.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';

export interface InjectionRange {
    start: number;
    end: number;
    colorIndex: number;
}

export interface InjectionRangeResult {
    ranges: InjectionRange[];
    matchCount: number;
    hasIdentifiers: boolean;
}

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

export function useInjectionRanges(): InjectionRangeResult {
    const test = useTestStore(selectActiveTest);
    const spl = (test && test.query && test.query.spl) || '';

    const indexedIds = useMemo(() => {
        if (!test || test.testType === 'query_only') return [];
        var result: Array<{ id: string; colorIndex: number }> = [];
        var idx = 0;
        for (var si = 0; si < test.scenarios.length; si++) {
            var scenario = test.scenarios[si];
            for (var ii = 0; ii < scenario.inputs.length; ii++) {
                var trimmed = scenario.inputs[ii].rowIdentifier.trim();
                if (trimmed.length >= 6) {
                    result.push({ id: trimmed, colorIndex: idx });
                    idx++;
                }
            }
        }
        return result;
    }, [test]);

    var hasIdentifiers = indexedIds.length > 0;

    var ranges = useMemo(function () {
        if (!spl || indexedIds.length === 0) return [];
        var all: InjectionRange[] = [];
        for (var i = 0; i < indexedIds.length; i++) {
            var entry = indexedIds[i];
            var matches = findAllMatches(spl, entry.id);
            for (var j = 0; j < matches.length; j++) {
                all.push({
                    start: matches[j].start,
                    end: matches[j].end,
                    colorIndex: entry.colorIndex,
                });
            }
        }
        return all;
    }, [spl, indexedIds]);

    return { ranges: ranges, matchCount: ranges.length, hasIdentifiers: hasIdentifiers };
}
```

- [ ] **Step 2: Refactor `useInjectionMarkers.ts` to use `useInjectionRanges`**

Rewrite to delegate to `useInjectionRanges` and just map ranges to `SplWarning[]`:

```typescript
/**
 * useInjectionMarkers — Ace editor markers from injection ranges.
 * Delegates matching logic to useInjectionRanges.
 */
import { useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useInjectionRanges } from './useInjectionRanges';
import type { SplWarning } from '../features/query/splLinter';

interface InjectionMatchResult {
    markers: SplWarning[];
    matchCount: number;
    hasIdentifiers: boolean;
}

export function useInjectionMarkers(): InjectionMatchResult {
    const test = useTestStore(selectActiveTest);
    const spl = (test && test.query && test.query.spl) || '';
    var { ranges, matchCount, hasIdentifiers } = useInjectionRanges();

    var markers = useMemo(function () {
        if (!spl || ranges.length === 0) return [] as SplWarning[];
        var result: SplWarning[] = [];
        for (var i = 0; i < ranges.length; i++) {
            var r = ranges[i];
            result.push({
                start: r.start,
                end: r.end,
                token: spl.slice(r.start, r.end),
                message: 'Will be replaced with temp index at run time',
                severity: 'injection' as 'injection',
                isBlocked: false,
                colorIndex: r.colorIndex,
            });
        }
        return result;
    }, [spl, ranges]);

    return { markers: markers, matchCount: matchCount, hasIdentifiers: hasIdentifiers };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: extract useInjectionRanges for shared injection matching"
```

---

## Task 3: Create `WizardStepper` component

**Files:**
- Create: `packages/query-tester-app/src/features/layout/WizardStepper.tsx`

- [ ] **Step 1: Create `WizardStepper.tsx`**

```typescript
/**
 * WizardStepper — horizontal step bar with numbered circles, labels,
 * and connecting pipes. Completed steps are clickable.
 */
import React from 'react';

export interface WizardStep {
    id: string;
    label: string;
    isComplete: boolean;
}

interface WizardStepperProps {
    steps: WizardStep[];
    activeStep: number;
    onStepClick: (index: number) => void;
}

function StepCircle({ step, index, isActive, onClick }: {
    step: WizardStep; index: number; isActive: boolean;
    onClick: (() => void) | undefined;
}): React.ReactElement {
    var canClick = step.isComplete && !isActive;
    var ringClass = step.isComplete
        ? 'border-green-500 bg-green-900/30'
        : isActive
            ? 'border-blue-300 bg-navy-700'
            : 'border-slate-600 bg-navy-800/60';
    var textClass = step.isComplete
        ? 'text-green-400'
        : isActive
            ? 'text-blue-300'
            : 'text-slate-500';
    var labelClass = step.isComplete
        ? 'text-green-400/80'
        : isActive
            ? 'text-slate-200 font-semibold'
            : 'text-slate-500';

    return (
        <button
            type="button"
            onClick={canClick ? onClick : undefined}
            className={'flex items-center gap-2 shrink-0 focus:outline-none ' + (canClick ? 'cursor-pointer group' : 'cursor-default')}
        >
            <span className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-[1.5px] transition-colors duration-200 ' + ringClass + ' ' + textClass + (canClick ? ' group-hover:brightness-110' : '')}>
                {step.isComplete ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    index + 1
                )}
            </span>
            <span className={'text-[13px] tracking-wide ' + labelClass}>
                {step.label}
            </span>
        </button>
    );
}

function StepPipe({ filled }: { filled: boolean }): React.ReactElement {
    return (
        <div className="flex-1 h-7 flex items-center mx-2 min-w-[32px] max-w-[80px]">
            <div className={'w-full h-[2px] rounded-full transition-colors duration-300 ' + (filled ? 'bg-green-500' : 'bg-slate-700')} />
        </div>
    );
}

export function WizardStepper({ steps, activeStep, onStepClick }: WizardStepperProps): React.ReactElement {
    return (
        <div className="flex items-center px-6 py-3">
            {steps.map(function (step, i) {
                return (
                    <React.Fragment key={step.id}>
                        <StepCircle
                            step={step}
                            index={i}
                            isActive={i === activeStep}
                            onClick={function () { onStepClick(i); }}
                        />
                        {i < steps.length - 1 && (
                            <StepPipe filled={step.isComplete} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/layout/WizardStepper.tsx
git commit -m "feat: add WizardStepper component"
```

---

## Task 4: Create `WizardNavigation` component

**Files:**
- Create: `packages/query-tester-app/src/features/layout/WizardNavigation.tsx`

- [ ] **Step 1: Create `WizardNavigation.tsx`**

```typescript
/**
 * WizardNavigation — Next / Back / Run buttons at the bottom of the active step.
 */
import React from 'react';

interface WizardNavigationProps {
    activeStep: number;
    totalSteps: number;
    stepLabels: string[];
    canGoNext: boolean;
    isRunning: boolean;
    onNext: () => void;
    onBack: () => void;
    onRun: () => void;
}

export function WizardNavigation({
    activeStep, totalSteps, stepLabels, canGoNext, isRunning, onNext, onBack, onRun,
}: WizardNavigationProps): React.ReactElement {
    var isFirst = activeStep === 0;
    var isLast = activeStep === totalSteps - 1;
    var nextLabel = !isLast && stepLabels[activeStep + 1]
        ? 'Next: ' + stepLabels[activeStep + 1]
        : 'Next';
    var backLabel = !isFirst && stepLabels[activeStep - 1]
        ? stepLabels[activeStep - 1]
        : 'Back';

    return (
        <div className="flex items-center justify-between pt-4 mt-auto shrink-0">
            {!isFirst ? (
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-slate-400 border border-slate-700 rounded-lg hover:border-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    {backLabel}
                </button>
            ) : (
                <div />
            )}

            {isLast ? (
                <button
                    type="button"
                    onClick={onRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-lg bg-green-500 text-slate-900 hover:bg-green-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
                        </svg>
                    )}
                    {isRunning ? 'Running...' : 'Run Test'}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canGoNext}
                    className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-300 text-slate-900 hover:bg-blue-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {nextLabel}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/layout/WizardNavigation.tsx
git commit -m "feat: add WizardNavigation component"
```

---

## Task 5: Create `QuerySidebar` component

**Files:**
- Create: `packages/query-tester-app/src/features/layout/QuerySidebar.tsx`

- [ ] **Step 1: Create `QuerySidebar.tsx`**

```typescript
/**
 * QuerySidebar — resizable, collapsible sidebar showing SPL + metadata.
 * Visible on Data and Validation steps. Supports drag-resize and collapse toggle.
 */
import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useInjectionRanges } from '../../hooks/useInjectionRanges';

interface QuerySidebarProps {
    collapsed: boolean;
    width: number;
    onToggle: () => void;
    onResize: (width: number) => void;
    onEditClick: () => void;
}

/** Injection highlight colors matching the Ace marker palette */
var COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

function renderSplWithInjections(
    spl: string,
    ranges: Array<{ start: number; end: number; colorIndex: number }>,
): React.ReactElement[] {
    if (ranges.length === 0) {
        return [React.createElement('span', { key: 'plain' }, spl)];
    }
    var sorted = ranges.slice().sort(function (a, b) { return a.start - b.start; });
    var parts: React.ReactElement[] = [];
    var cursor = 0;
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        if (r.start > cursor) {
            parts.push(React.createElement('span', { key: 'txt-' + i }, spl.slice(cursor, r.start)));
        }
        parts.push(React.createElement('span', {
            key: 'inj-' + i,
            style: { backgroundColor: COLORS[r.colorIndex % COLORS.length] + '30', borderBottom: '2px solid ' + COLORS[r.colorIndex % COLORS.length] },
        }, spl.slice(r.start, r.end)));
        cursor = r.end;
    }
    if (cursor < spl.length) {
        parts.push(React.createElement('span', { key: 'tail' }, spl.slice(cursor)));
    }
    return parts;
}

export function QuerySidebar({ collapsed, width, onToggle, onResize, onEditClick }: QuerySidebarProps): React.ReactElement {
    var test = useTestStore(selectActiveTest);
    var spl = (test && test.query && test.query.spl) || '';
    var origin = (test && test.query && test.query.savedSearchOrigin) || '';
    var timeRange = (test && test.query) ? test.query.timeRange : null;
    var extractedDataSources = useTestStore(function (s) { return s.extractedDataSources || []; });
    var { ranges } = useInjectionRanges();

    var fieldNames = useMemo(function () {
        if (!extractedDataSources || extractedDataSources.length === 0) return [];
        var fields: string[] = [];
        for (var i = 0; i < extractedDataSources.length; i++) {
            var ds = extractedDataSources[i];
            if (ds.fields) {
                for (var j = 0; j < ds.fields.length; j++) {
                    if (fields.indexOf(ds.fields[j]) === -1) {
                        fields.push(ds.fields[j]);
                    }
                }
            }
        }
        return fields;
    }, [extractedDataSources]);

    // Drag resize logic
    var dragRef = useRef<{ startX: number; startW: number } | null>(null);

    var handleMouseDown = useCallback(function (e: React.MouseEvent) {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startW: width };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [width]);

    useEffect(function () {
        function handleMouseMove(e: MouseEvent) {
            if (!dragRef.current) return;
            var newW = dragRef.current.startW + (e.clientX - dragRef.current.startX);
            onResize(newW);
        }
        function handleMouseUp() {
            if (!dragRef.current) return;
            dragRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return function () {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [onResize]);

    var trLabel = '';
    if (timeRange) {
        trLabel = timeRange.preset || (timeRange.earliest || '') + ' to ' + (timeRange.latest || '');
    }

    // Collapsed state
    if (collapsed) {
        return (
            <div
                className="w-[40px] bg-navy-800 border border-slate-700/20 rounded-l-xl flex flex-col items-center pt-3 shrink-0 cursor-pointer hover:bg-navy-700/50 transition-colors"
                onClick={onToggle}
            >
                <div className="bg-slate-700 text-slate-400 w-6 h-6 rounded flex items-center justify-center text-sm hover:text-slate-200 transition-colors mb-3"
                    title="Expand sidebar">
                    &#187;
                </div>
                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }} className="text-[11px] text-slate-500 tracking-[2px] font-semibold uppercase">
                    QUERY
                </div>
            </div>
        );
    }

    // Expanded state
    return (
        <React.Fragment>
            <div
                className="bg-navy-800 border border-slate-700/20 rounded-l-xl flex flex-col shrink-0 overflow-hidden"
                style={{ width: width + 'px', minWidth: '180px' }}
            >
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-slate-700/30 flex items-center justify-between shrink-0">
                    <span className="text-[13px] font-bold text-slate-200">Query</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onEditClick}
                            className="text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer transition-colors">
                            edit
                        </button>
                        <button type="button" onClick={onToggle}
                            className="bg-slate-700 text-slate-400 w-6 h-6 rounded flex items-center justify-center text-sm hover:text-slate-200 cursor-pointer transition-colors"
                            title="Collapse sidebar">
                            &#171;
                        </button>
                    </div>
                </div>

                {/* SPL display */}
                <div className="px-3 py-3 flex-1 overflow-y-auto">
                    <pre className="font-mono text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {renderSplWithInjections(spl, ranges)}
                    </pre>

                    {/* Metadata */}
                    <div className="mt-4 pt-3 border-t border-slate-700/30 flex flex-col gap-3">
                        {origin && (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Saved Search</div>
                                <div className="text-[12px] text-slate-400">{origin}</div>
                            </div>
                        )}
                        {trLabel && (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Time Range</div>
                                <div className="text-[12px] text-slate-400">{trLabel}</div>
                            </div>
                        )}
                        {fieldNames.length > 0 && (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fields</div>
                                <div className="flex flex-wrap gap-1">
                                    {fieldNames.map(function (f) {
                                        return (
                                            <span key={f} className="bg-navy-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-blue-300 font-mono">
                                                {f}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Drag handle */}
            <div
                className="w-[6px] bg-navy-700/50 hover:bg-blue-300/30 cursor-col-resize flex items-center justify-center shrink-0 transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="w-[2px] h-8 bg-slate-600 rounded" />
            </div>
        </React.Fragment>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/layout/QuerySidebar.tsx
git commit -m "feat: add QuerySidebar component with resize and collapse"
```

---

## Task 6: Create `WizardLayout` and wire into `StartPage`

**Files:**
- Create: `packages/query-tester-app/src/features/layout/WizardLayout.tsx`
- Modify: `packages/query-tester-app/src/StartPage.tsx`
- Delete: `packages/query-tester-app/src/features/layout/BuilderPanels.tsx`
- Delete: `packages/query-tester-app/src/features/layout/ViewModeToggle.tsx`

- [ ] **Step 1: Create `WizardLayout.tsx`**

```typescript
/**
 * WizardLayout — orchestrates stepper, query sidebar, and active step content.
 * Replaces BuilderPanels.
 */
import React, { useCallback, useMemo } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest, selectIsRunning, inputHasData } from 'core/store/selectors';
import { WizardStepper } from './WizardStepper';
import type { WizardStep } from './WizardStepper';
import { WizardNavigation } from './WizardNavigation';
import { QuerySidebar } from './QuerySidebar';
import { QuerySection } from '../query/QuerySection';
import { ScenarioPanel } from '../scenarios/ScenarioPanel';
import { ValidationSection } from '../validation/ValidationSection';

export function WizardLayout(): React.ReactElement {
    var test = useTestStore(selectActiveTest);
    var isRunning = useTestStore(selectIsRunning);
    var activeStep = useTestStore(function (s) { return s.activeStep; });
    var setActiveStep = useTestStore(function (s) { return s.setActiveStep; });
    var sidebarCollapsed = useTestStore(function (s) { return s.querySidebarCollapsed; });
    var sidebarWidth = useTestStore(function (s) { return s.querySidebarWidth; });
    var toggleSidebar = useTestStore(function (s) { return s.toggleQuerySidebar; });
    var setSidebarWidth = useTestStore(function (s) { return s.setQuerySidebarWidth; });
    var lastExtractedSpl = useTestStore(function (s) { return s.lastExtractedSpl; });
    var setLastExtractedSpl = useTestStore(function (s) { return s.setLastExtractedSpl; });
    var extractDS = useTestStore(function (s) { return s.fetchExtractDataSources; });
    var runTest = useTestStore(function (s) { return s.runTest; });

    var testType = (test && test.testType) || 'standard';
    var isQueryOnly = testType === 'query_only';
    var spl = (test && test.query && test.query.spl) || '';
    var hasQuery = spl.trim() !== '';
    var dataDone = inputHasData((test && test.scenarios) || []);

    // Build step definitions
    var stepDefs = useMemo(function () {
        if (isQueryOnly) {
            return [
                { id: 'query', label: 'Query', isComplete: hasQuery },
                { id: 'validation', label: 'Validation', isComplete: false },
            ];
        }
        return [
            { id: 'query', label: 'Query', isComplete: hasQuery },
            { id: 'data', label: 'Data', isComplete: dataDone },
            { id: 'validation', label: 'Validation', isComplete: false },
        ] as WizardStep[];
    }, [isQueryOnly, hasQuery, dataDone]);

    var stepLabels = useMemo(function () {
        return stepDefs.map(function (s) { return s.label; });
    }, [stepDefs]);

    // Clamp activeStep to valid range
    var clampedStep = activeStep >= stepDefs.length ? stepDefs.length - 1 : activeStep;
    if (clampedStep < 0) clampedStep = 0;

    var canGoNext = function (): boolean {
        if (clampedStep === 0) return hasQuery;
        if (!isQueryOnly && clampedStep === 1) return dataDone;
        return false;
    };

    var handleNext = useCallback(function () {
        var nextStep = clampedStep + 1;
        // Auto extract fields when leaving Query step for Data step
        if (clampedStep === 0 && !isQueryOnly && test) {
            var currentSpl = (test.query && test.query.spl) || '';
            if (currentSpl.trim() && currentSpl !== lastExtractedSpl) {
                var s0 = test.scenarios[0];
                var sid = s0 ? s0.id : undefined;
                if (sid) {
                    extractDS(test.id, sid, currentSpl).catch(function () { /* ignore */ });
                }
                setLastExtractedSpl(currentSpl);
            }
        }
        setActiveStep(nextStep);
    }, [clampedStep, isQueryOnly, test, lastExtractedSpl, extractDS, setLastExtractedSpl, setActiveStep]);

    var handleBack = useCallback(function () {
        setActiveStep(Math.max(0, clampedStep - 1));
    }, [clampedStep, setActiveStep]);

    var handleStepClick = useCallback(function (index: number) {
        // Only allow clicking completed (past) steps
        if (index < clampedStep) {
            setActiveStep(index);
        }
    }, [clampedStep, setActiveStep]);

    var handleEditClick = useCallback(function () {
        setActiveStep(0);
    }, [setActiveStep]);

    var handleRun = useCallback(function () {
        if (test) {
            runTest(test.id);
        }
    }, [test, runTest]);

    // Map step index to content component
    var currentStepId = stepDefs[clampedStep] ? stepDefs[clampedStep].id : 'query';
    var showSidebar = clampedStep > 0;

    return (
        <div className="flex flex-col flex-1 min-h-0 px-5 pb-5 pt-3 animate-fadeIn">
            {/* Stepper bar */}
            <WizardStepper steps={stepDefs} activeStep={clampedStep} onStepClick={handleStepClick} />

            {/* Content area */}
            <div className="flex flex-1 min-h-0 mt-2">
                {/* Query sidebar — hidden on step 0 */}
                {showSidebar && (
                    <QuerySidebar
                        collapsed={sidebarCollapsed}
                        width={sidebarWidth}
                        onToggle={toggleSidebar}
                        onResize={setSidebarWidth}
                        onEditClick={handleEditClick}
                    />
                )}

                {/* Active step content */}
                <div className={'flex-1 min-w-0 bg-navy-800 border border-slate-700/20 p-5 shadow-lg shadow-black/20 overflow-y-auto flex flex-col gap-4 ' + (showSidebar ? 'rounded-r-xl' : 'rounded-xl')}>
                    <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wide">
                        {stepDefs[clampedStep] ? stepDefs[clampedStep].label : ''}
                    </span>

                    {currentStepId === 'query' && <QuerySection />}
                    {currentStepId === 'data' && <ScenarioPanel />}
                    {currentStepId === 'validation' && <ValidationSection />}

                    <WizardNavigation
                        activeStep={clampedStep}
                        totalSteps={stepDefs.length}
                        stepLabels={stepLabels}
                        canGoNext={canGoNext()}
                        isRunning={isRunning}
                        onNext={handleNext}
                        onBack={handleBack}
                        onRun={handleRun}
                    />
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Update `StartPage.tsx` — replace `BuilderPanels` with `WizardLayout`**

In `StartPage.tsx`:

Remove these imports:
```typescript
import { ViewModeToggle } from './features/layout/ViewModeToggle';
import { BuilderPanels } from './features/layout/BuilderPanels';
import { usePipelineState } from './features/layout/usePipelineState';
import { StepPipeline } from './features/layout/StepPipeline';
```

Add this import:
```typescript
import { WizardLayout } from './features/layout/WizardLayout';
```

Remove these variables that are no longer needed:
- `rowRef`, `queryRef`, `dataRef`, `validationRef` refs
- `showData`, `dataDone`, `showValidation` booleans
- `pipeline` from `usePipelineState()`
- `panelCount`, `prevCount`, `scrollToEnd`, and their `useEffect`
- `handleStepClick` callback

In the setup bar (the `hasApp` block), remove:
```tsx
{!isIde && <><div className="w-px h-5 bg-slate-700" /><ViewModeToggle /></>}
```

Replace the `BuilderPanels` render block:
```tsx
// FROM:
) : hasApp ? (
    <BuilderPanels rowRef={rowRef} queryRef={queryRef} dataRef={dataRef} validationRef={validationRef}
        hasQuery={hasQuery} showData={showData} dataDone={dataDone} showValidation={showValidation} />
) : null}

// TO:
) : hasApp ? (
    <WizardLayout />
) : null}
```

- [ ] **Step 3: Delete `BuilderPanels.tsx` and `ViewModeToggle.tsx`**

Delete:
- `packages/query-tester-app/src/features/layout/BuilderPanels.tsx`
- `packages/query-tester-app/src/features/layout/ViewModeToggle.tsx`

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 5: Build**

Run: `yarn build`
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace 3-panel builder with wizard layout"
```

---

## Task 7: Cleanup and final verification

**Files:**
- All modified files from Tasks 1-6

- [ ] **Step 1: Grep for stale references**

```bash
grep -rn "panelViewMode\|PanelViewMode\|PanelId\|collapsedPanels\|togglePanelCollapsed\|setPanelViewMode\|setActivePanelIndex\|BuilderPanels\|ViewModeToggle" packages/query-tester-app/src/
```

Fix any remaining references. Each match should be removed or updated.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Run build**

Run: `yarn build`
Expected: clean build

- [ ] **Step 4: Run frontend tests**

Run: `yarn workspace @splunk/query-tester-app run test`
Expected: all tests pass (some may need updates if they reference deleted components)

- [ ] **Step 5: Visual test in browser**

Start dev server: `yarn dev`

Verify:
1. Open http://localhost:3000 — SetupCard shows when no app selected
2. Select an app → Query step shows (full width, no sidebar)
3. Enter SPL → "Next: Data" button appears and is clickable
4. Click Next → Data step shows with sidebar on left showing SPL
5. Sidebar has drag handle — drag to resize
6. Click `«` to collapse sidebar → thin strip with "QUERY" text
7. Click `»` to expand sidebar
8. Click "edit" in sidebar → jumps back to Query step
9. Enter data → "Next: Validation" button clickable
10. Click Next → Validation step with sidebar
11. Green "Run Test" button at bottom of Validation step
12. Click stepper circles to jump back to completed steps
13. Results bar at bottom still works (expand/collapse)
14. Switch to query_only test type → only 2 steps (Query, Validation), Data skipped

- [ ] **Step 6: Run audit**

Run the `splunk-query-tester-audit` skill checks:
- No `any` types
- No `console.log`
- No React 18 APIs
- No `?.` or `??`
- Zustand default import
- All files under 200 lines
- Named Props interfaces

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: cleanup stale panel references after wizard redesign"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|------------------|------|
| 3-step wizard (Query → Data → Validation) | Task 6 (WizardLayout) |
| query_only skips Data step | Task 6 (stepDefs logic) |
| Stepper bar with numbered circles | Task 3 (WizardStepper) |
| Completed steps clickable | Task 3 (StepCircle canClick) |
| Next/Back buttons with labels | Task 4 (WizardNavigation) |
| Run button on last step | Task 4 (isLast → Run Test) |
| Resizable query sidebar | Task 5 (QuerySidebar drag) |
| Collapse/expand toggle | Task 5 (collapsed state, «/» buttons) |
| Sidebar hidden on Step 1 | Task 6 (showSidebar = clampedStep > 0) |
| SPL with injection markers in sidebar | Task 5 (renderSplWithInjections) |
| Metadata: saved search, time range, fields | Task 5 (metadata section) |
| Auto Extract Fields on Query→Data | Task 6 (handleNext) |
| Skip if already extracted | Task 6 (lastExtractedSpl check) |
| Results bar unchanged | Not touched |
| Sidebar state persisted to localStorage | Task 1 (wizardSlice LS_COLLAPSED, LS_WIDTH) |
| panelSlice removed | Task 1 (delete) |
| ViewModeToggle removed | Task 6 (delete) |
| BuilderPanels removed | Task 6 (delete) |
| Shared injection matching | Task 2 (useInjectionRanges) |
| IDE mode unchanged | Not touched |
| Audit compliance | Task 7 |
