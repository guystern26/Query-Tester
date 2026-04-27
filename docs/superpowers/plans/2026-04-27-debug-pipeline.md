# Debug Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When user clicks "Help me debug this", automatically run the SPL pipe-by-pipe, find where results drop to 0, and show the user which stage broke — like stepping through a real debugger.

**Architecture:** A new `debug_pipeline` action handler in `chatActions.ts` splits the SPL at each `|`, runs progressively longer prefixes via `runIdeQuery`, and reports results as a compact step list in the chat. No LLM involvement in the actual debugging — it's pure mechanical execution. The LLM just triggers it by emitting `~~~action:debug_pipeline~~~`.

**Tech Stack:** React 16, Zustand v4, existing `runIdeQuery` API, `splFormatter.ts` for pipe splitting

---

## File Map

| File | Change | Responsibility |
|------|--------|---------------|
| `src/core/store/slices/chatActions.ts` | Modify | Add `debug_pipeline` handler that runs pipe prefixes |
| `src/features/ide/ChatMessageParts.tsx` | Modify | Render debug results as a step list with row counts |
| `src/features/ide/chatUtils.ts` | No change | `debug_pipeline` already in `ParsedAction` type |
| `src/api/chatPrompts.ts` | Minor | Strengthen the debug instruction in the prompt |

---

### Task 1: Implement `debug_pipeline` Handler

**Files:**
- Modify: `packages/query-tester-app/src/core/store/slices/chatActions.ts`

The handler splits the SPL at top-level pipes (respecting brackets/quotes), runs each prefix progressively, and stores per-step results in the action result.

- [ ] **Step 1: Add the DebugStepResult type**

At the top of `chatActions.ts` (after the imports, around line 10), add:

```ts
export interface DebugStepResult {
    stage: number;
    spl: string;
    rowCount: number;
    timeMs: number;
    status: 'ok' | 'zero' | 'error';
    error?: string;
}
```

Also extend `ActionResult` in `chatSlice.ts` to include debug steps:

In `packages/query-tester-app/src/core/store/slices/chatSlice.ts`, update the `ActionResult` interface:

```ts
export interface ActionResult {
    status: 'loading' | 'success' | 'error';
    rows?: Record<string, string>[];
    error?: string;
    debugSteps?: DebugStepResult[];
}
```

- [ ] **Step 2: Add the pipe-splitting utility**

In `chatActions.ts`, add this function (before `createExecuteChatAction`):

```ts
/**
 * Split SPL into pipe stages, respecting brackets and quotes.
 * Returns array of cumulative prefixes: ["base", "base | cmd1", "base | cmd1 | cmd2", ...]
 */
function splitPipePrefixes(spl: string): string[] {
    const prefixes: string[] = [];
    let depth = 0;
    let inDouble = false;
    let inSingle = false;
    let lastSplit = 0;
    const segments: string[] = [];

    for (let i = 0; i < spl.length; i++) {
        const ch = spl[i];
        if (ch === '"' && !inSingle) inDouble = !inDouble;
        else if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (!inDouble && !inSingle) {
            if (ch === '[') depth++;
            else if (ch === ']') depth--;
            else if (ch === '|' && depth === 0) {
                segments.push(spl.slice(lastSplit, i).trim());
                lastSplit = i + 1;
            }
        }
    }
    segments.push(spl.slice(lastSplit).trim());

    // Build cumulative prefixes
    let cumulative = '';
    for (const seg of segments) {
        if (!seg) continue;
        cumulative = cumulative ? cumulative + ' | ' + seg : seg;
        prefixes.push(cumulative);
    }
    return prefixes;
}
```

- [ ] **Step 3: Add the debug_pipeline handler in createExecuteChatAction**

In `createExecuteChatAction`, after the `update_spl` block (after line 184's `return;`), add before the `// run_query` comment:

```ts
        if (action.type === 'debug_pipeline') {
            const spl = test.query && test.query.spl ? test.query.spl : '';
            if (!spl.trim()) {
                set((d) => {
                    const target = d.chatMessages.find((m) => m.id === messageId);
                    if (target) {
                        if (!target.actionResults) target.actionResults = {};
                        target.actionResults[actionId] = { status: 'error', error: 'No SPL in editor' };
                    }
                });
                return;
            }

            const prefixes = splitPipePrefixes(spl);
            if (prefixes.length <= 1) {
                set((d) => {
                    const target = d.chatMessages.find((m) => m.id === messageId);
                    if (target) {
                        if (!target.actionResults) target.actionResults = {};
                        target.actionResults[actionId] = { status: 'error', error: 'Query has only one stage — nothing to step through' };
                    }
                });
                return;
            }

            // Set loading
            set((d) => {
                const target = d.chatMessages.find((m) => m.id === messageId);
                if (target) {
                    if (!target.actionResults) target.actionResults = {};
                    target.actionResults[actionId] = { status: 'loading', debugSteps: [] };
                }
            });

            const tr = test.query && test.query.timeRange
                ? { earliest: test.query.timeRange.earliest || '0', latest: test.query.timeRange.latest || 'now' }
                : undefined;
            const steps: DebugStepResult[] = [];
            let foundZero = false;

            for (let i = 0; i < prefixes.length; i++) {
                if (foundZero) break;
                const prefix = prefixes[i];
                const start = Date.now();
                try {
                    const resp = await runIdeQuery(test.app || '', prefix, tr);
                    const elapsed = Date.now() - start;
                    const count = resp.resultCount || 0;
                    const step: DebugStepResult = {
                        stage: i + 1,
                        spl: prefix,
                        rowCount: count,
                        timeMs: elapsed,
                        status: count === 0 ? 'zero' : 'ok',
                    };
                    steps.push(step);

                    // Update UI after each step
                    set((d) => {
                        const target = d.chatMessages.find((m) => m.id === messageId);
                        if (target && target.actionResults) {
                            target.actionResults[actionId] = { status: 'loading', debugSteps: [...steps] };
                        }
                    });

                    if (count === 0) foundZero = true;
                } catch (e) {
                    const err = e as { message?: string };
                    steps.push({
                        stage: i + 1,
                        spl: prefix,
                        rowCount: 0,
                        timeMs: Date.now() - start,
                        status: 'error',
                        error: err.message || 'Query failed',
                    });
                    foundZero = true;

                    set((d) => {
                        const target = d.chatMessages.find((m) => m.id === messageId);
                        if (target && target.actionResults) {
                            target.actionResults[actionId] = { status: 'loading', debugSteps: [...steps] };
                        }
                    });
                }
            }

            // Final state
            set((d) => {
                const target = d.chatMessages.find((m) => m.id === messageId);
                if (target && target.actionResults) {
                    target.actionResults[actionId] = { status: 'success', debugSteps: steps };
                }
            });
            return;
        }
```

- [ ] **Step 4: Add DebugStepResult to the import in chatSlice.ts**

In `chatSlice.ts`, add the import:

```ts
import type { DebugStepResult } from './chatActions';
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test|testLibrarySlice.test|import.meta.env"`

- [ ] **Step 6: Commit**

```bash
git add packages/query-tester-app/src/core/store/slices/chatActions.ts packages/query-tester-app/src/core/store/slices/chatSlice.ts
git commit -m "feat: debug_pipeline handler — runs SPL pipe-by-pipe, finds zero-result stage"
```

---

### Task 2: Render Debug Steps in Chat

**Files:**
- Modify: `packages/query-tester-app/src/features/ide/ChatMessageParts.tsx`

Replace the generic "Apply to editor" button for `debug_pipeline` actions with a step-by-step visualization showing each pipe stage's row count.

- [ ] **Step 1: Import DebugStepResult**

At the top of `ChatMessageParts.tsx`, add:

```ts
import type { DebugStepResult } from 'core/store/slices/chatActions';
```

- [ ] **Step 2: Create DebugPipelineResult component**

Add before the `ActionButton` component (around line 129):

```tsx
function DebugPipelineResult({ steps }: { steps: DebugStepResult[] }): React.ReactElement {
    const [expandedStage, setExpandedStage] = useState<number | null>(null);
    const problemStage = steps.find((s) => s.status === 'zero' || s.status === 'error');

    return (
        <div className="flex flex-col gap-1 mt-1">
            {steps.map((step) => {
                const isExpanded = expandedStage === step.stage;
                const icon = step.status === 'ok' ? '\u2713' : step.status === 'zero' ? '\u2717' : '\u26A0';
                const color = step.status === 'ok' ? 'text-green-400' : step.status === 'zero' ? 'text-red-400' : 'text-amber-400';
                const bg = step.status === 'ok' ? 'bg-green-400/5' : step.status === 'zero' ? 'bg-red-500/5' : 'bg-amber-500/5';

                // Extract just the last pipe segment for display
                const parts = step.spl.split('|');
                const lastPipe = parts[parts.length - 1].trim();
                const label = parts.length === 1 ? lastPipe : '| ' + lastPipe;

                return (
                    <div key={step.stage} className={`rounded px-2 py-1 ${bg}`}>
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setExpandedStage(isExpanded ? null : step.stage)}
                        >
                            <span className={`text-[11px] font-mono ${color}`}>{icon}</span>
                            <span className="text-[11px] text-slate-400 font-mono flex-1 truncate">{label}</span>
                            <span className={`text-[10px] tabular-nums ${color}`}>
                                {step.rowCount} row{step.rowCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-slate-600 tabular-nums">{step.timeMs}ms</span>
                        </div>
                        {isExpanded && (
                            <pre className="text-[9px] text-slate-500 font-mono mt-1 pl-5 whitespace-pre-wrap break-all">
                                {step.spl}
                            </pre>
                        )}
                        {isExpanded && step.error && (
                            <div className="text-[10px] text-red-400 mt-1 pl-5">{step.error}</div>
                        )}
                    </div>
                );
            })}
            {problemStage && (
                <div className="text-[11px] text-amber-300 mt-1 px-2">
                    Results dropped at stage {problemStage.stage}: <span className="text-slate-400 font-mono">
                        {problemStage.spl.split('|').pop().trim()}
                    </span>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Update ActionButton to use DebugPipelineResult**

In the `ActionButton` component, update the render to show debug results when available. Replace the existing `{result && isRunQuery && <ChatActionResult result={result} />}` line (around line 172) with:

```tsx
            {result && isRunQuery && !result.debugSteps && <ChatActionResult result={result} />}
            {result && result.debugSteps && <DebugPipelineResult steps={result.debugSteps} />}
```

Also update the button label logic (around line 139):

```ts
    const isDebug = action.type === 'debug_pipeline';
    const isRunQuery = action.type === 'run_query' || action.type === 'auto_query';
    const label = isDebug ? 'Debug pipeline' : isRunQuery ? 'Run this query' : 'Apply to editor';
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test|testLibrarySlice.test|import.meta.env"`

- [ ] **Step 5: Commit**

```bash
git add packages/query-tester-app/src/features/ide/ChatMessageParts.tsx
git commit -m "feat: render debug pipeline steps with row counts and problem indicator"
```

---

### Task 3: Strengthen LLM Debug Prompt + Auto-Execute

**Files:**
- Modify: `packages/query-tester-app/src/api/chatPrompts.ts`
- Modify: `packages/query-tester-app/src/core/store/slices/chatActions.ts`

Make the LLM reliably emit `debug_pipeline` when asked to debug, and auto-execute `auto_query` and `debug_pipeline` actions without requiring a button click.

- [ ] **Step 1: Update the action instructions in chatPrompts.ts**

Replace the `debug_pipeline` section in `ACTION_INSTRUCTIONS` (around lines 67-73):

```ts
To debug the current query pipe-by-pipe (runs each prefix, stops where results drop to 0):
~~~action:debug_pipeline
~~~

When the user asks to debug, troubleshoot, or figure out why a query returns no results,
ALWAYS emit a debug_pipeline action IMMEDIATELY. Do not describe what you will do — just
emit the action block. After it runs, explain the results.

NEVER use auto_query with data-modifying commands (delete, outputlookup, collect, etc.).
Only use actions when they clearly help. Always explain what the action does.
```

- [ ] **Step 2: Auto-execute debug_pipeline and auto_query actions**

In `chatActions.ts`, in the `createSendChatMessage` function, after the LLM response is parsed and the message is pushed to state (around line 145), add auto-execution logic:

Find the line `set((d) => { d.chatMessages.push(entry); d.chatLoading = false; });` and add after it:

```ts
            // Auto-execute debug_pipeline and auto_query actions
            if (entry.actions && entry.actions.length > 0) {
                const autoTypes = ['debug_pipeline', 'auto_query'];
                for (const act of entry.actions) {
                    if (autoTypes.includes(act.type)) {
                        // Small delay to let the UI render the message first
                        setTimeout(() => {
                            const execFn = createExecuteChatAction(set, get);
                            void execFn(entry.id, act.id);
                        }, 100);
                    }
                }
            }
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scheduledTestsSlice.test|testLibrarySlice.test|import.meta.env"`

- [ ] **Step 4: Commit**

```bash
git add packages/query-tester-app/src/api/chatPrompts.ts packages/query-tester-app/src/core/store/slices/chatActions.ts
git commit -m "feat: auto-execute debug_pipeline, stronger LLM debug prompt"
```

---

### Task 4: Rebuild + Push

- [ ] **Step 1: Rebuild webpack**

```bash
cd packages/query-tester && ./node_modules/.bin/webpack --mode=production
```

- [ ] **Step 2: Commit bundles**

```bash
git add packages/query-tester/stage/appserver/static/
git commit -m "Rebuild webpack bundles"
```

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```

- [ ] **Step 4: Push to clean (QueryTester4Ever)**

Use the temp-clone workflow from memory.
