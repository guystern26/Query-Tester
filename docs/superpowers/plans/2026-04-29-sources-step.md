# Sources Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "Sources" wizard step between Query and Data where users explicitly mark which parts of their SPL are injection targets.

**Architecture:** New wizard step renders a full-width interactive SPL display with a confirmed-sources strip below. AI-detected and regex-fallback sources appear pre-highlighted. The user confirms, dismisses, or adds custom sources. Advancing to Data auto-creates input cards. The Data step sidebar becomes read-only.

**Tech Stack:** React 16.13, Zustand v4 (default import), Tailwind CSS 3, TypeScript

**Constraints:** No `any` types. Named Props interfaces. Files under 200 lines. No React 18 APIs. No `?.`/`??` in new code. `import create from 'zustand'` (default import). Run `npx tsc --noEmit` and webpack build clean before done.

**Spec:** `docs/superpowers/specs/2026-04-28-sources-step-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|----------------|
| `src/features/sources/SourcesStep.tsx` | Main component — full-width SPL display + confirmed sources strip |
| `src/features/sources/SourceChip.tsx` | Single confirmed source chip (dot, RI text, field tags, remove button) |
| `src/features/sources/useConfirmedSources.ts` | Hook: sync confirmed sources from store, derive from extraction + inputs |

### Modified files
| File | Changes |
|------|---------|
| `src/core/store/slices/wizardSlice.ts` | Add `confirmedSources` state + 4 actions |
| `src/core/store/storeTypes.ts` | Re-export `WizardSliceState` (already extends — new fields come via the interface) |
| `src/features/layout/WizardLayout.tsx` | 4-step flow, render `SourcesStep`, move extraction to Query→Sources, remove sidebar interactivity |
| `src/features/layout/QuerySidebar.tsx` | Remove `interactive` and `onSourceClick` props |
| `src/features/scenarios/ScenarioPanel.tsx` | Update empty state text |

### Reused unchanged
| File | Used by |
|------|---------|
| `src/features/layout/InteractiveSidebar.tsx` | SourcesStep (clickable SPL rendering) |
| `src/features/layout/interactiveSidebarHelpers.tsx` | SourcesStep (render helpers) |
| `src/features/layout/SourceTooltip.tsx` | SourcesStep (hover tooltips) |
| `src/hooks/useSourceSpans.ts` | SourcesStep (span detection) |

---

## Task 1: Add confirmed sources state to wizard slice

**Files:**
- Modify: `packages/query-tester-app/src/core/store/slices/wizardSlice.ts`

- [ ] **Step 1: Add ConfirmedSource type and state to WizardSliceState**

Add to the interface after `lastExtractedSpl`:

```typescript
    confirmedSources: Array<{
        rowIdentifier: string;
        fields: string[];
        colorIndex: number;
    }>;
```

Add to `wizardInitialState`:

```typescript
    confirmedSources: [],
```

- [ ] **Step 2: Add 4 new actions to the slice**

Add to the return object of `wizardSlice`:

```typescript
        setConfirmedSources: function (sources: Array<{ rowIdentifier: string; fields: string[]; colorIndex: number }>): void {
            set(function (d) { d.confirmedSources = sources; });
        },
        addConfirmedSource: function (rowIdentifier: string, fields: string[]): void {
            set(function (d) {
                // Don't add duplicates
                for (var i = 0; i < d.confirmedSources.length; i++) {
                    if (d.confirmedSources[i].rowIdentifier.toLowerCase() === rowIdentifier.toLowerCase()) return;
                }
                var nextColor = d.confirmedSources.length;
                d.confirmedSources.push({ rowIdentifier: rowIdentifier, fields: fields, colorIndex: nextColor });
            });
        },
        removeConfirmedSource: function (rowIdentifier: string): void {
            set(function (d) {
                d.confirmedSources = d.confirmedSources.filter(function (s) {
                    return s.rowIdentifier.toLowerCase() !== rowIdentifier.toLowerCase();
                });
            });
        },
        clearConfirmedSources: function (): void {
            set(function (d) { d.confirmedSources = []; });
        },
```

- [ ] **Step 3: Clear confirmed sources in resetWizard**

In the existing `resetWizard` action, add:

```typescript
                d.confirmedSources = [];
```

- [ ] **Step 4: Add action types to storeTypes.ts**

In `storeTypes.ts`, in the `// --- Wizard ---` section, add after `resetWizard`:

```typescript
    setConfirmedSources: (sources: Array<{ rowIdentifier: string; fields: string[]; colorIndex: number }>) => void;
    addConfirmedSource: (rowIdentifier: string, fields: string[]) => void;
    removeConfirmedSource: (rowIdentifier: string) => void;
    clearConfirmedSources: () => void;
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "wizardSlice|storeTypes"`

- [ ] **Step 6: Commit**

```bash
git add packages/query-tester-app/src/core/store/slices/wizardSlice.ts packages/query-tester-app/src/core/store/storeTypes.ts
git commit -m "feat: add confirmedSources state and actions to wizard slice"
```

---

## Task 2: Create SourceChip component

**Files:**
- Create: `packages/query-tester-app/src/features/sources/SourceChip.tsx`

- [ ] **Step 1: Create the component**

```typescript
/**
 * SourceChip — confirmed source chip in the Sources step strip.
 * Shows colored dot, row identifier, field tags, and remove button.
 */
import React from 'react';

var SOURCE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

interface SourceChipProps {
    rowIdentifier: string;
    fields: string[];
    colorIndex: number;
    onRemove: () => void;
}

export function SourceChip({ rowIdentifier, fields, colorIndex, onRemove }: SourceChipProps): React.ReactElement {
    var color = SOURCE_COLORS[colorIndex % SOURCE_COLORS.length];

    return (
        <div
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg transition-colors"
            style={{ backgroundColor: color + '15', border: '1px solid ' + color + '30' }}
        >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[12px] font-mono text-slate-200 truncate max-w-[200px]" title={rowIdentifier}>
                {rowIdentifier}
            </span>
            {fields.length > 0 && (
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                    ({fields.length} field{fields.length !== 1 ? 's' : ''})
                </span>
            )}
            <button
                type="button"
                onClick={onRemove}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-red-900/30 hover:text-red-400 cursor-pointer transition-all text-[13px] flex-shrink-0 ml-0.5"
                title="Remove this data source"
            >
                {'\u00D7'}
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/sources/SourceChip.tsx
git commit -m "feat: add SourceChip component for confirmed sources strip"
```

---

## Task 3: Create SourcesStep component

**Files:**
- Create: `packages/query-tester-app/src/features/sources/SourcesStep.tsx`

This is the main component for the Sources wizard step. It reuses `InteractiveSidebar` for the clickable SPL display and shows the confirmed sources strip below.

- [ ] **Step 1: Create SourcesStep.tsx**

```typescript
/**
 * SourcesStep — full-width step for marking data source injection targets.
 * Top: interactive SPL display with clickable/drag-selectable sources.
 * Bottom: confirmed sources strip with chips.
 */
import React, { useCallback, useState } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { InteractiveSidebar } from '../layout/InteractiveSidebar';
import { SourceChip } from './SourceChip';

interface SourcesStepProps {
    onSourcesChanged?: () => void;
}

export function SourcesStep({ onSourcesChanged }: SourcesStepProps): React.ReactElement | null {
    var test = useTestStore(selectActiveTest);
    var confirmedSources = useTestStore(function (s) { return s.confirmedSources; });
    var addConfirmedSource = useTestStore(function (s) { return s.addConfirmedSource; });
    var removeConfirmedSource = useTestStore(function (s) { return s.removeConfirmedSource; });
    var [manualInput, setManualInput] = useState('');
    var [showManualInput, setShowManualInput] = useState(false);

    var spl = (test && test.query && test.query.spl) || '';

    var handleSourceClick = useCallback(function (ri: string, fields: string[]) {
        // Toggle: if already confirmed, remove it; otherwise add it
        var found = false;
        for (var i = 0; i < confirmedSources.length; i++) {
            if (confirmedSources[i].rowIdentifier.toLowerCase() === ri.toLowerCase()) {
                found = true;
                break;
            }
        }
        if (found) {
            removeConfirmedSource(ri);
        } else {
            addConfirmedSource(ri, fields);
        }
    }, [confirmedSources, addConfirmedSource, removeConfirmedSource]);

    var handleManualAdd = useCallback(function () {
        var trimmed = manualInput.trim();
        if (trimmed.length >= 3) {
            addConfirmedSource(trimmed, []);
            setManualInput('');
            setShowManualInput(false);
        }
    }, [manualInput, addConfirmedSource]);

    var handleManualKeyDown = useCallback(function (e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleManualAdd();
        if (e.key === 'Escape') { setShowManualInput(false); setManualInput(''); }
    }, [handleManualAdd]);

    if (!test) return null;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div>
                <h3 className="text-[14px] font-semibold text-slate-200 mb-1">
                    Mark data sources in your query
                </h3>
                <p className="text-[12px] text-slate-500">
                    Click highlighted text to confirm or dismiss. Drag-select to add custom sources.
                </p>
            </div>

            {/* SPL display — reuses InteractiveSidebar */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-navy-900 rounded-lg border border-slate-700/30 p-4">
                <InteractiveSidebar spl={spl} onSourceClick={handleSourceClick} />
            </div>

            {/* Confirmed sources strip */}
            <div className="shrink-0">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    Confirmed sources ({confirmedSources.length})
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {confirmedSources.map(function (src) {
                        return (
                            <SourceChip
                                key={src.rowIdentifier}
                                rowIdentifier={src.rowIdentifier}
                                fields={src.fields}
                                colorIndex={src.colorIndex}
                                onRemove={function () { removeConfirmedSource(src.rowIdentifier); }}
                            />
                        );
                    })}
                    {showManualInput ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={manualInput}
                                onChange={function (e) { setManualInput(e.target.value); }}
                                onKeyDown={handleManualKeyDown}
                                onBlur={function () { if (!manualInput.trim()) setShowManualInput(false); }}
                                autoFocus
                                placeholder="Type injection target..."
                                className="px-2 py-1 text-[12px] font-mono bg-navy-950 border border-slate-600 rounded-md text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-300 w-[220px]"
                            />
                            <button
                                type="button"
                                onClick={handleManualAdd}
                                disabled={manualInput.trim().length < 3}
                                className="px-2 py-1 text-[11px] text-blue-300 hover:text-blue-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={function () { setShowManualInput(true); }}
                            className="px-2.5 py-1 rounded-lg border border-dashed border-slate-600 text-[11px] text-slate-400 hover:text-blue-300 hover:border-blue-300/40 cursor-pointer transition-colors"
                        >
                            + Add manually
                        </button>
                    )}
                    {confirmedSources.length === 0 && !showManualInput && (
                        <span className="text-[11px] text-slate-600 italic ml-1">
                            No sources selected — click highlighted text above or add manually
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/sources/SourcesStep.tsx
git commit -m "feat: add SourcesStep component with interactive SPL display and source chips"
```

---

## Task 4: Wire Sources step into WizardLayout

**Files:**
- Modify: `packages/query-tester-app/src/features/layout/WizardLayout.tsx`

- [ ] **Step 1: Add SourcesStep import**

After the existing imports, add:

```typescript
import { SourcesStep } from '../sources/SourcesStep';
```

- [ ] **Step 2: Update stepDefs to include Sources step**

Replace the standard (non-queryOnly) step definitions:

```typescript
        return [
            { id: 'query', label: 'Query', isComplete: hasQuery },
            { id: 'sources', label: 'Sources', isComplete: confirmedSources.length > 0 },
            { id: 'data', label: 'Data', isComplete: dataDone },
            { id: 'validation', label: 'Validation', isComplete: hasValidation },
        ];
```

Add the store selector at the top of the component:

```typescript
    var confirmedSources = useTestStore(function (s) { return s.confirmedSources; });
    var setConfirmedSources = useTestStore(function (s) { return s.setConfirmedSources; });
```

Add `confirmedSources.length` to the `stepDefs` useMemo dependency array.

- [ ] **Step 3: Move extraction trigger to Query→Sources transition**

In `handleNext`, the extraction currently fires when `clampedStep === 0`. Update to also populate confirmed sources from the extraction result:

```typescript
    var handleNext = useCallback(function () {
        if (clampedStep === 0 && test) {
            var currentSpl = (test.query && test.query.spl) || '';
            var formatted = formatSpl(currentSpl);
            if (formatted !== currentSpl) updateSpl(test.id, formatted);
            if (!isQueryOnly && formatted.trim() && formatted !== lastExtractedSpl) {
                var s0 = test.scenarios[0];
                if (s0) {
                    extractDS(test.id, s0.id, formatted).then(function (sources) {
                        if (sources && sources.length > 0) {
                            var mapped = sources.map(function (src, i) {
                                return { rowIdentifier: src.rowIdentifier, fields: src.fields, colorIndex: i };
                            });
                            setConfirmedSources(mapped);
                        }
                    }).catch(function () {});
                }
                setLastExtractedSpl(formatted);
            }
        }
        // Sources → Data: auto-create input cards from confirmed sources
        if (currentStepId === 'sources' && test) {
            var s0 = test.scenarios[0];
            if (s0) {
                for (var i = 0; i < confirmedSources.length; i++) {
                    var cs = confirmedSources[i];
                    addInputFromSource(test.id, s0.id, cs.rowIdentifier, cs.fields);
                }
            }
        }
        setActiveStep(clampedStep + 1);
    }, [clampedStep, isQueryOnly, test, lastExtractedSpl, extractDS, setLastExtractedSpl, setActiveStep, updateSpl, currentStepId, confirmedSources, addInputFromSource, setConfirmedSources]);
```

- [ ] **Step 4: Update canGoNext logic**

The Sources step should allow advancing when at least 1 source is confirmed:

```typescript
    var canGoNext = clampedStep === 0
        ? hasQuery
        : (currentStepId === 'sources')
            ? confirmedSources.length > 0
            : (currentStepId === 'data')
                ? dataDone
                : false;
```

- [ ] **Step 5: Render SourcesStep in the content area**

In the content card section, add between the Query and Data renders:

```typescript
                    {currentStepId === 'sources' ? <SourcesStep /> : null}
```

- [ ] **Step 6: Update sidebar visibility**

Change sidebar to show on Data and Validation steps only (not Sources — Sources is full-width):

```typescript
    var showSidebar = currentStepId === 'data' || currentStepId === 'validation';
```

- [ ] **Step 7: Remove sidebar interactive props**

Remove the `interactive` and `onSourceClick` props from the `QuerySidebar` render:

```tsx
                    <QuerySidebar
                        collapsed={sidebarCollapsed}
                        width={sidebarWidth}
                        onToggle={toggleSidebar}
                        onResize={setSidebarWidth}
                        onEditClick={handleEditClick}
                    />
```

Remove the `handleSourceClick` callback entirely (lines 111-116).

- [ ] **Step 8: Remove the auto-expand sidebar effect**

Remove the `useEffect` that auto-expands the sidebar when entering the Data step (it was needed when the sidebar was interactive; now it's just a reference panel).

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep WizardLayout`

- [ ] **Step 10: Commit**

```bash
git add packages/query-tester-app/src/features/layout/WizardLayout.tsx
git commit -m "feat: wire Sources step into wizard as step 2 of 4"
```

---

## Task 5: Clean up QuerySidebar — remove interactive props

**Files:**
- Modify: `packages/query-tester-app/src/features/layout/QuerySidebar.tsx`

- [ ] **Step 1: Remove interactive props from interface and component**

Remove from `QuerySidebarProps`:

```typescript
    interactive?: boolean;
    onSourceClick?: (rowIdentifier: string, fields: string[]) => void;
```

Remove from the component destructuring:

```typescript
export function QuerySidebar({ collapsed, width, onToggle, onResize, onEditClick }: QuerySidebarProps)
```

- [ ] **Step 2: Remove the InteractiveSidebar import and conditional render**

Remove the import:

```typescript
import { InteractiveSidebar } from './InteractiveSidebar';
```

Replace the conditional render block:

```typescript
                    {interactive && onSourceClick ? (
                        <InteractiveSidebar spl={spl} onSourceClick={onSourceClick} />
                    ) : (
                        <pre className="font-mono ...">
                            {renderHighlightedSpl(spl, ranges)}
                        </pre>
                    )}
```

With just the `<pre>` block (always render the passive view):

```typescript
                    <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                        {renderHighlightedSpl(spl, ranges)}
                    </pre>
```

- [ ] **Step 3: Verify TypeScript compiles**
- [ ] **Step 4: Commit**

```bash
git add packages/query-tester-app/src/features/layout/QuerySidebar.tsx
git commit -m "refactor: remove interactive mode from QuerySidebar — now always passive"
```

---

## Task 6: Update ScenarioPanel empty state

**Files:**
- Modify: `packages/query-tester-app/src/features/scenarios/ScenarioPanel.tsx`

- [ ] **Step 1: Update the empty state**

Replace the current empty state (chevron + "Click a data source in the query sidebar"):

```typescript
                    {sel.inputs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mb-3">
                                <path d="M15 19l-7-7 7-7" />
                            </svg>
                            <p className="text-sm text-slate-400 mb-1">Click a data source in the query sidebar</p>
                            <p className="text-xs text-slate-500 mb-4">Your query has highlighted data sources — click one to start building test data.</p>
                            <Button variant="primary" size="sm" onClick={() => addInput(test.id, sel.id)}>+ Add Input Manually</Button>
                        </div>
```

With:

```typescript
                    {sel.inputs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mb-3">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                            </svg>
                            <p className="text-sm text-slate-400 mb-1">No inputs yet</p>
                            <p className="text-xs text-slate-500 mb-4">Go back to Sources to mark data sources, or add an input manually.</p>
                            <Button variant="primary" size="sm" onClick={() => addInput(test.id, sel.id)}>+ Add Input Manually</Button>
                        </div>
```

- [ ] **Step 2: Verify TypeScript compiles**
- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/scenarios/ScenarioPanel.tsx
git commit -m "refactor: update Data step empty state to reference Sources step"
```

---

## Task 7: Final verification and audit

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: zero new errors

- [ ] **Step 2: Webpack build**

Run: `cd packages/query-tester && ./node_modules/.bin/webpack --mode=production`
Expected: clean build

- [ ] **Step 3: File size check**

All new and modified files must be under 200 lines.

- [ ] **Step 4: Run splunk-query-tester-audit**

Run the audit skill on all new/modified files.

- [ ] **Step 5: Visual test**

Start dev server (`yarn dev`) and verify:
1. Write SPL on Query step → click Next
2. Sources step appears with highlighted sources in SPL
3. Click a source to dismiss → chip disappears, underline reverts
4. Drag-select custom text → "+ Add as data source" button → chip appears
5. "+ Add manually" button → type custom source → chip appears
6. Click Next → Data step has input cards pre-created for each confirmed source
7. Data step sidebar is read-only (no clickable spans)
8. Go Back to Sources → confirmed sources match what was set
9. Query-only tests skip Sources step entirely

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: sources step final verification"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|------------------|------|
| 4-step wizard (Query → Sources → Data → Validation) | Task 4 (stepDefs) |
| Confirmed sources state in store | Task 1 (wizardSlice) |
| SourceChip component | Task 2 |
| SourcesStep with interactive SPL + strip | Task 3 |
| Wire into WizardLayout | Task 4 |
| Extraction fires on Query→Sources | Task 4 step 3 |
| Auto-create inputs on Sources→Data | Task 4 step 3 |
| Sidebar becomes read-only | Task 5 |
| Update empty state | Task 6 |
| Query-only tests skip Sources | Task 4 step 2 (isQueryOnly branch unchanged) |
