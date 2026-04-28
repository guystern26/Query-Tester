# Interactive Data Source Picker — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Inject Into" text field with an interactive query sidebar where users click AI-highlighted data sources to configure injection, with orphaned filter warnings.

**Architecture:** The query sidebar gains an interactive mode on the Data step. AI-extracted data sources are rendered as clickable spans. Clicking creates a pre-filled input card. An editable badge replaces the old DataSourceSelector. Orphaned filters are highlighted in red. Phase 2 (hover tooltips, drag-select, injection preview) is deferred.

**Tech Stack:** React 16.13, Zustand v4 (default import), Tailwind CSS 3, TypeScript (no `?.`/`??`)

**Constraints:** No `any` types. Named Props interfaces. Files under 200 lines. No React 18 APIs. Run `npx tsc --noEmit` and `yarn build` clean before done.

---

## File Structure

### New files
| File | Responsibility |
|------|----------------|
| `src/features/layout/InteractiveSidebar.tsx` | Interactive version of query sidebar for Data step — clickable source spans, orphan warnings |
| `src/features/scenarios/SourceBadge.tsx` | Editable colored badge replacing DataSourceSelector on input cards |
| `src/hooks/useOrphanedFilters.ts` | Detects orphaned filters in the base search clause given a row identifier |
| `src/hooks/useSourceSpans.ts` | Maps extracted data sources to character ranges in the SPL for rendering clickable spans |

### Modified files
| File | Changes |
|------|---------|
| `src/features/layout/QuerySidebar.tsx` | Accept `interactive` prop, delegate to InteractiveSidebar when true |
| `src/features/layout/WizardLayout.tsx` | Pass `interactive={true}` to sidebar on Data step |
| `src/features/scenarios/InputCard.tsx` | Replace DataSourceSelector with SourceBadge when row identifier is set |
| `src/features/scenarios/ScenarioPanel.tsx` | Add empty state prompt when no inputs yet ("Click a data source...") |
| `src/core/store/slices/inputSlice.ts` | New action: `addInputFromSource(testId, scenarioId, rowIdentifier, fields)` |
| `src/core/store/storeTypes.ts` | Add new action type |

### Kept unchanged
| File | Why |
|------|-----|
| `src/features/layout/splHighlight.tsx` | Syntax highlighting still used — interactive sidebar layers source spans on top |
| `src/features/scenarios/DataSourceSelector.tsx` | Kept as fallback for no-LLM environments |
| Backend `query_injector.py` | No changes — injection logic is unchanged |

---

## Phase 1 Scope

This plan covers:
- Clickable data source spans in sidebar
- Orphaned filter warnings (red highlights)
- Editable source badge on input cards
- Empty state prompt on Data step
- Auto-expand sidebar when collapsed on Data step

Deferred to Phase 2:
- Hover tooltips with event count
- Drag-select for custom sources
- Injection preview panel
- Match count `×N` indicator

---

## Task 1: `useSourceSpans` hook

**Files:**
- Create: `packages/query-tester-app/src/hooks/useSourceSpans.ts`

This hook takes the SPL text and extracted data sources, and returns character ranges for each source in the SPL — used to render clickable spans.

- [ ] **Step 1: Create the hook**

```typescript
/**
 * useSourceSpans — maps extracted data sources to character ranges in SPL.
 * Returns spans for rendering clickable source regions in the interactive sidebar.
 */
import { useMemo } from 'react';

export interface SourceSpan {
    start: number;
    end: number;
    sourceIndex: number;
    rowIdentifier: string;
    fields: string[];
}

interface SourceSpanResult {
    spans: SourceSpan[];
}

function findAllOccurrences(haystack: string, needle: string): Array<{ start: number; end: number }> {
    if (!needle) return [];
    var results: Array<{ start: number; end: number }> = [];
    var lower = haystack.toLowerCase();
    var target = needle.toLowerCase();
    var pos = 0;
    while (pos < lower.length) {
        var idx = lower.indexOf(target, pos);
        if (idx === -1) break;
        results.push({ start: idx, end: idx + needle.length });
        pos = idx + 1;
    }
    return results;
}

export function useSourceSpans(
    spl: string,
    sources: Array<{ rowIdentifier: string; fields: string[] }>,
): SourceSpanResult {
    var spans = useMemo(function (): SourceSpan[] {
        if (!spl || sources.length === 0) return [];
        var all: SourceSpan[] = [];
        for (var i = 0; i < sources.length; i++) {
            var src = sources[i];
            var occurrences = findAllOccurrences(spl, src.rowIdentifier);
            for (var j = 0; j < occurrences.length; j++) {
                all.push({
                    start: occurrences[j].start,
                    end: occurrences[j].end,
                    sourceIndex: i,
                    rowIdentifier: src.rowIdentifier,
                    fields: src.fields,
                });
            }
        }
        // Sort by start position, longest match first for overlaps
        all.sort(function (a, b) {
            return a.start !== b.start ? a.start - b.start : b.end - a.end;
        });
        return all;
    }, [spl, sources]);

    return { spans: spans };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/hooks/useSourceSpans.ts
git commit -m "feat: add useSourceSpans hook for interactive sidebar"
```

---

## Task 2: `useOrphanedFilters` hook

**Files:**
- Create: `packages/query-tester-app/src/hooks/useOrphanedFilters.ts`

Detects `key=value` filters in the base search clause that are NOT covered by the selected row identifier.

- [ ] **Step 1: Create the hook**

```typescript
/**
 * useOrphanedFilters — detects filters that will remain after injection.
 * Scans the base search clause (before first |) for key=value patterns
 * not covered by the row identifier.
 */
import { useMemo } from 'react';

export interface OrphanedFilter {
    text: string;
    start: number;
    end: number;
}

var FILTER_RE = /\b\w+\s*=\s*[^\s|)\]]+/gi;

export function useOrphanedFilters(spl: string, rowIdentifier: string): OrphanedFilter[] {
    return useMemo(function (): OrphanedFilter[] {
        if (!spl || !rowIdentifier.trim()) return [];

        // Find base search clause (before first |)
        var pipeIdx = spl.indexOf('|');
        var base = pipeIdx >= 0 ? spl.slice(0, pipeIdx) : spl;

        // Find all key=value filters in base clause
        var orphans: OrphanedFilter[] = [];
        var match;
        FILTER_RE.lastIndex = 0;
        while ((match = FILTER_RE.exec(base)) !== null) {
            var filterText = match[0];
            // Check if this filter is covered by the row identifier
            if (rowIdentifier.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
                orphans.push({
                    text: filterText,
                    start: match.index,
                    end: match.index + filterText.length,
                });
            }
        }
        return orphans;
    }, [spl, rowIdentifier]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/hooks/useOrphanedFilters.ts
git commit -m "feat: add useOrphanedFilters hook for orphan filter warnings"
```

---

## Task 3: `InteractiveSidebar` component

**Files:**
- Create: `packages/query-tester-app/src/features/layout/InteractiveSidebar.tsx`

The interactive version of the sidebar content — renders clickable source spans over syntax-highlighted SPL, with orphaned filter warnings.

- [ ] **Step 1: Create InteractiveSidebar.tsx**

This component renders the SPL with three overlay layers:
1. Syntax highlighting (from splHighlight.tsx)
2. Clickable data source spans (underlined, clickable)
3. Orphaned filter warnings (red underline)

```typescript
/**
 * InteractiveSidebar — renders SPL with clickable data source spans
 * and orphaned filter warnings. Used on the Data step.
 */
import React, { useCallback } from 'react';
import { useTestStore } from 'core/store/testStore';
import { selectActiveTest } from 'core/store/selectors';
import { useSourceSpans } from '../../hooks/useSourceSpans';
import type { SourceSpan } from '../../hooks/useSourceSpans';

var SOURCE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

interface InteractiveSidebarProps {
    spl: string;
    onSourceClick: (rowIdentifier: string, fields: string[]) => void;
}

/** Check if a source is already used as an input in the active scenario */
function useUsedIdentifiers(): Set<string> {
    var test = useTestStore(selectActiveTest);
    var used = new Set<string>();
    if (!test) return used;
    for (var si = 0; si < test.scenarios.length; si++) {
        var inputs = test.scenarios[si].inputs;
        for (var ii = 0; ii < inputs.length; ii++) {
            var ri = inputs[ii].rowIdentifier.trim();
            if (ri) used.add(ri.toLowerCase());
        }
    }
    return used;
}

function renderInteractiveSpl(
    spl: string,
    spans: SourceSpan[],
    usedSet: Set<string>,
    onClick: (ri: string, fields: string[]) => void,
): React.ReactElement[] {
    if (spans.length === 0) {
        return [React.createElement('span', { key: 'plain' }, spl)];
    }

    var parts: React.ReactElement[] = [];
    var cursor = 0;

    for (var i = 0; i < spans.length; i++) {
        var sp = spans[i];
        // Skip if overlapping with previous span
        if (sp.start < cursor) continue;

        // Plain text before this span
        if (sp.start > cursor) {
            parts.push(React.createElement('span', { key: 'txt-' + i }, spl.slice(cursor, sp.start)));
        }

        var isUsed = usedSet.has(sp.rowIdentifier.toLowerCase());
        var color = SOURCE_COLORS[sp.sourceIndex % SOURCE_COLORS.length];
        var text = spl.slice(sp.start, sp.end);

        parts.push(React.createElement('span', {
            key: 'src-' + i,
            onClick: isUsed ? undefined : function () { onClick(sp.rowIdentifier, sp.fields); },
            style: {
                borderBottom: '2px solid ' + (isUsed ? color : color + '80'),
                backgroundColor: isUsed ? color + '20' : 'transparent',
                cursor: isUsed ? 'default' : 'pointer',
                borderRadius: '2px',
                transition: 'background-color 150ms',
            },
            onMouseEnter: function (e: React.MouseEvent) {
                if (!isUsed) (e.currentTarget as HTMLElement).style.backgroundColor = color + '25';
            },
            onMouseLeave: function (e: React.MouseEvent) {
                if (!isUsed) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            },
            title: isUsed ? 'Already configured' : 'Click to add test data',
        }, text));

        cursor = sp.end;
    }

    if (cursor < spl.length) {
        parts.push(React.createElement('span', { key: 'tail' }, spl.slice(cursor)));
    }
    return parts;
}

export function InteractiveSidebar({ spl, onSourceClick }: InteractiveSidebarProps): React.ReactElement {
    var test = useTestStore(selectActiveTest);
    var sources = (test && test.fieldExtraction && test.fieldExtraction.sources) || [];
    var { spans } = useSourceSpans(spl, sources);
    var usedSet = useUsedIdentifiers();

    var handleClick = useCallback(function (ri: string, fields: string[]) {
        onSourceClick(ri, fields);
    }, [onSourceClick]);

    var hasSources = spans.length > 0;

    return (
        <div className="flex flex-col gap-2">
            <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                {renderInteractiveSpl(spl, spans, usedSet, handleClick)}
            </pre>
            {!hasSources && sources.length === 0 && (
                <div className="text-[11px] text-slate-500 italic mt-2">
                    No data sources detected. Select text manually or type in the input card.
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/layout/InteractiveSidebar.tsx
git commit -m "feat: add InteractiveSidebar with clickable data source spans"
```

---

## Task 4: `SourceBadge` component

**Files:**
- Create: `packages/query-tester-app/src/features/scenarios/SourceBadge.tsx`

Editable colored badge replacing DataSourceSelector. Shows the row identifier with color, click-to-edit, orphaned filter warning.

- [ ] **Step 1: Create SourceBadge.tsx**

```typescript
/**
 * SourceBadge — editable colored badge for the row identifier.
 * Replaces DataSourceSelector when a source was picked from the sidebar.
 */
import React, { useState, useCallback } from 'react';
import type { EntityId } from 'core/types';
import { useTestStore } from 'core/store/testStore';
import { useOrphanedFilters } from '../../hooks/useOrphanedFilters';
import { selectActiveTest } from 'core/store/selectors';

interface SourceBadgeProps {
    testId: EntityId;
    scenarioId: EntityId;
    inputId: EntityId;
    value: string;
    colorIndex: number;
    matchCount: number;
}

var COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4'];

export function SourceBadge({ testId, scenarioId, inputId, value, colorIndex, matchCount }: SourceBadgeProps): React.ReactElement {
    var updateRowIdentifier = useTestStore(function (s) { return s.updateRowIdentifier; });
    var deleteInput = useTestStore(function (s) { return s.deleteInput; });
    var test = useTestStore(selectActiveTest);
    var spl = (test && test.query && test.query.spl) || '';
    var _editing = useState(false);
    var isEditing = _editing[0];
    var setIsEditing = _editing[1];

    var color = COLORS[colorIndex % COLORS.length];
    var orphans = useOrphanedFilters(spl, value);

    var handleChange = useCallback(function (e: React.ChangeEvent<HTMLInputElement>) {
        updateRowIdentifier(testId, scenarioId, inputId, e.target.value);
    }, [testId, scenarioId, inputId, updateRowIdentifier]);

    var handleRemove = useCallback(function () {
        deleteInput(testId, scenarioId, inputId);
    }, [testId, scenarioId, inputId, deleteInput]);

    return (
        <div className="mb-3">
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <input
                        type="text"
                        value={value}
                        onChange={handleChange}
                        onBlur={function () { setIsEditing(false); }}
                        autoFocus
                        className="flex-1 px-2 py-1 text-[12px] font-mono bg-navy-950 border rounded-md text-slate-200 focus:outline-none focus:border-blue-300"
                        style={{ borderColor: color + '60' }}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={function () { setIsEditing(true); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono text-slate-200 cursor-pointer transition-colors hover:brightness-110"
                        style={{ backgroundColor: color + '20', border: '1px solid ' + color + '40' }}
                        title="Click to edit data source"
                    >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        {value}
                        {matchCount > 1 && (
                            <span className="text-[10px] text-slate-500 ml-1">{'\u00D7' + matchCount}</span>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleRemove}
                    className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-400 cursor-pointer transition-colors text-[13px]"
                    title="Remove data source"
                >
                    {'\u00D7'}
                </button>
            </div>

            <div className="text-[10px] text-slate-500 mt-1">
                All occurrences of this text in your query will be replaced with test data.
            </div>

            {orphans.length > 0 && (
                <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-red-500/5 border border-red-500/20">
                    <span className="text-red-400 text-[12px] mt-px">{'\u26A0'}</span>
                    <div className="text-[11px] text-red-300/80 leading-snug">
                        <span className="font-medium">Orphaned filters: </span>
                        {orphans.map(function (o) { return o.text; }).join(', ')}
                        <span className="text-slate-500"> — these stay in the query and may cause zero results. Include them in the data source or add matching values to your test events.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/scenarios/SourceBadge.tsx
git commit -m "feat: add SourceBadge with editable row identifier and orphan warnings"
```

---

## Task 5: Store action `addInputFromSource`

**Files:**
- Modify: `packages/query-tester-app/src/core/store/slices/inputSlice.ts`
- Modify: `packages/query-tester-app/src/core/store/storeTypes.ts`

New store action that creates an input pre-filled with a row identifier and field names from the sidebar click.

- [ ] **Step 1: Add action type to storeTypes.ts**

Add to the `TestStoreState` interface, in the `--- Inputs ---` section:

```typescript
    addInputFromSource: (testId: EntityId, scenarioId: EntityId, rowIdentifier: string, fields: string[]) => void;
```

- [ ] **Step 2: Implement in inputSlice.ts**

Add to the return object of `inputSlice`:

```typescript
    addInputFromSource: (testId: EntityId, scenarioId: EntityId, rowIdentifier: string, fields: string[]) =>
      set((draft) => {
        const scenario = findScenario(findTest(draft.tests, testId)?.scenarios, scenarioId);
        if (!scenario || scenario.inputs.length >= MAX_INPUTS_PER_SCENARIO) return;
        const newInput = createDefaultInput();
        newInput.rowIdentifier = rowIdentifier;
        newInput.inputMode = 'fields';
        // Pre-populate first event with field names
        if (fields.length > 0 && newInput.events.length > 0) {
          const evt = newInput.events[0];
          evt.fieldValues = fields.map(function (f) {
            return { id: crypto.randomUUID(), field: f, value: '' };
          });
        }
        scenario.inputs.push(newInput);
      }),
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add packages/query-tester-app/src/core/store/slices/inputSlice.ts packages/query-tester-app/src/core/store/storeTypes.ts
git commit -m "feat: add addInputFromSource store action"
```

---

## Task 6: Wire InteractiveSidebar into QuerySidebar + WizardLayout

**Files:**
- Modify: `packages/query-tester-app/src/features/layout/QuerySidebar.tsx`
- Modify: `packages/query-tester-app/src/features/layout/WizardLayout.tsx`

- [ ] **Step 1: Add `interactive` and `onSourceClick` props to QuerySidebar**

In `QuerySidebarProps`, add:

```typescript
    interactive?: boolean;
    onSourceClick?: (rowIdentifier: string, fields: string[]) => void;
```

In the expanded sidebar content, replace the `<pre>` block with a conditional:

```typescript
{interactive && onSourceClick ? (
    <InteractiveSidebar spl={spl} onSourceClick={onSourceClick} />
) : (
    <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
        {renderHighlightedSpl(spl, ranges)}
    </pre>
)}
```

Import `InteractiveSidebar` at the top.

- [ ] **Step 2: Pass `interactive` from WizardLayout**

In `WizardLayout.tsx`, add a callback and pass it to QuerySidebar:

```typescript
var addInputFromSource = useTestStore(function (s) { return s.addInputFromSource; });

var handleSourceClick = useCallback(function (ri: string, fields: string[]) {
    if (!test) return;
    var scenarioId = test.scenarios[0] ? test.scenarios[0].id : null;
    if (!scenarioId) return;
    addInputFromSource(test.id, scenarioId, ri, fields);
}, [test, addInputFromSource]);
```

Pass to QuerySidebar:

```tsx
<QuerySidebar
    collapsed={sidebarCollapsed}
    width={sidebarWidth}
    onToggle={toggleSidebar}
    onResize={setSidebarWidth}
    onEditClick={handleEditClick}
    interactive={currentStepId === 'data'}
    onSourceClick={handleSourceClick}
/>
```

- [ ] **Step 3: Auto-expand sidebar on Data step**

In WizardLayout, after the step change effect, add:

```typescript
// Auto-expand sidebar when entering Data step
useEffect(function () {
    if (clampedStep > 0 && sidebarCollapsed) {
        toggleSidebar();
    }
}, [clampedStep]);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add packages/query-tester-app/src/features/layout/QuerySidebar.tsx packages/query-tester-app/src/features/layout/WizardLayout.tsx
git commit -m "feat: wire interactive sidebar into wizard Data step"
```

---

## Task 7: Replace DataSourceSelector with SourceBadge in InputCard

**Files:**
- Modify: `packages/query-tester-app/src/features/scenarios/InputCard.tsx`

- [ ] **Step 1: Import SourceBadge and conditionally render**

Replace the DataSourceSelector import and usage. When a row identifier is already set (meaning it came from sidebar or was typed), show SourceBadge. When empty and no LLM sources available, fall back to DataSourceSelector.

In InputCard, replace the DataSourceSelector section:

```typescript
{input.rowIdentifier.trim() ? (
    <SourceBadge
        testId={testId}
        scenarioId={scenarioId}
        inputId={input.id}
        value={input.rowIdentifier}
        colorIndex={index ? index - 1 : 0}
        matchCount={matchCount}
    />
) : (
    <DataSourceSelector
        testId={testId}
        scenarioId={scenarioId}
        inputId={input.id}
        value={input.rowIdentifier}
        matchCount={matchCount}
        hasIdentifiers={hasIdentifiers}
    />
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/scenarios/InputCard.tsx
git commit -m "feat: replace DataSourceSelector with SourceBadge when source is set"
```

---

## Task 8: Empty state prompt on Data step

**Files:**
- Modify: `packages/query-tester-app/src/features/scenarios/ScenarioPanel.tsx`

- [ ] **Step 1: Add empty state when no inputs exist**

Replace the existing "No inputs yet" empty state with a sidebar-aware prompt:

```typescript
{sel.inputs.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mb-3">
            <path d="M15 19l-7-7 7-7" />
        </svg>
        <p className="text-sm text-slate-400 mb-1">Click a data source in the query sidebar</p>
        <p className="text-xs text-slate-500">Your query has highlighted data sources — click one to start building test data.</p>
    </div>
) : (
    /* existing input cards rendering */
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add packages/query-tester-app/src/features/scenarios/ScenarioPanel.tsx
git commit -m "feat: add sidebar-aware empty state prompt on Data step"
```

---

## Task 9: Final verification and cleanup

**Files:**
- All modified files from Tasks 1-8

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: zero new errors

- [ ] **Step 2: Webpack build**

Run: `cd packages/query-tester && ./node_modules/.bin/webpack --mode=production`
Expected: clean build

- [ ] **Step 3: Visual test in browser**

Start dev server: `yarn dev`

Verify:
1. Write SPL with `index=main sourcetype=access | stats count` → click Next to Data
2. Sidebar shows `index=main sourcetype=access` with a subtle underline
3. Click it → input card appears with row identifier badge and fields pre-populated
4. Badge shows amber color, click to edit → can type to expand/narrow
5. Orphaned filter warning: type `index=main` only → see red warning for `sourcetype=access`
6. Expand badge to include sourcetype → red warning disappears
7. Old DataSourceSelector still works as fallback when no sources extracted

- [ ] **Step 4: Run audit**

Run the `splunk-query-tester-audit` skill checks on all new/modified files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup and verify interactive data source picker"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|------------------|------|
| Clickable data source spans in sidebar | Task 3 (InteractiveSidebar) |
| Source span character range mapping | Task 1 (useSourceSpans) |
| Orphaned filter detection | Task 2 (useOrphanedFilters) |
| Editable colored badge | Task 4 (SourceBadge) |
| Pre-filled input card on click | Task 5 (addInputFromSource) |
| Interactive sidebar on Data step | Task 6 (wiring) |
| DataSourceSelector replaced | Task 7 (InputCard) |
| Empty state prompt | Task 8 (ScenarioPanel) |
| Auto-expand sidebar | Task 6 step 3 |
| Backward compatibility / no-LLM fallback | Task 7 (conditional render) |
| Strategy-specific highlighting | Deferred (Phase 2) |
| Hover tooltips | Deferred (Phase 2) |
| Drag-select custom sources | Deferred (Phase 2) |
| Injection preview | Deferred (Phase 2) |
| Match count ×N | Task 4 (basic, in SourceBadge) |
