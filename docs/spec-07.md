### 7. UX Design: Progressive Horizontal Flow


**7.1 Dark Mode Theme**
The entire application uses a dark theme. This is not a toggle; dark mode is the default and only mode. All CSS Modules reference dark-theme design tokens.

```
:root {
--bg-base: #0F0F1A;                 /* deepest background */
--bg-surface: #1A1A2E;              /* cards, panels */
--bg-elevated: #252540;             /* hover states, active cards */
--bg-input: #2D2D45;               /* input fields */
--border-default: #3A3A55;          /* subtle borders */
--border-active: #4A90D9;           /* focused/active elements */
--text-primary: #E8E8F0;            /* main text */
--text-secondary: #9898B0;          /* labels, hints */
--text-muted: #6A6A85;              /* disabled, placeholder */
--accent: #4A90D9;                  /* primary blue */
--accent-hover: #5BA0E9;
--success: #4ADE80;
--warning: #FBBF24;
--danger: #F87171;
--ijump-accent: #FB923C;            /* orange for iJump */
--radius-sm: 0.375rem;
--radius-md: 0.625rem;
--radius-lg: 0.875rem;
}
```

**7.2 Progressive Disclosure Flow**
**The user is NEVER overwhelmed. Sections reveal step-by-step:**

**Step 1: App + Test Name (always visible)**
AppChooser dropdown and test name input at the top. Must be filled before anything else is enabled. Test type selector (Standard / Query Only) also visible.

**Step 2: Query Section (revealed when app is selected)**
SPL editor with syntax highlighting. SavedSearchPicker dropdown next to it. 'Extract Fields' AI button. Section has a subtle slide-in animation.

**Step 3: Input Section (revealed when query has content)**
Only for testType 'standard'. ScenarioPanel with scenario cards, input cards inside. 'Extract Fields' results populate here. Section slides in from below.

**Step 4: Validation Section (revealed when inputs have data OR query_only mode)**
ValidationType toggle (Standard / iJump Alert). Field conditions or expected result. 'Suggest Fields' AI button. Section slides in.

**Run Button: Enabled only when all required sections are filled**
The Run button is disabled (grayed out, with a tooltip explaining what's missing) until:
App is selected.
Query SPL has content.
At least one scenario has at least one input with a row identifier (if standard test).
Validation has at least one condition or expected result.

*This makes the test-building flow feel like a guided pipeline, not a form dump.*

**7.3 Horizontal Layout**
All content is on one page. No tabs that hide content. The layout is horizontal with sections flowing left-to-right or top-to-bottom depending on viewport width. On wide screens, Query and Inputs can sit side by side. The results panel is a collapsible bar at the bottom.

**7.4 Animations**
**Minimal but meaningful animations:**
**Section reveal: **Slide-in + fade (200ms ease-out) when a section becomes active.
**Card add/remove: **New cards fade in (150ms). Removed cards fade out (100ms).
**AI extraction: **Shimmer/skeleton loading while LLM processes. Fields populate with a staggered fade-in.
**Run button: **Subtle pulse animation when all sections are filled and test is ready.
**Results panel: **Slide up from bottom when results arrive.
**Validation pass/fail: **Green checkmark or red X with scale animation per scenario result.

**7.5 Section Status Indicators**
Each section header shows a status indicator:
**Gray circle: **Section not yet accessible (prerequisite not met).
**Blue circle: **Section active, user is working on it.
**Green checkmark: **Section complete, requirements met.
**Orange warning: **Section has validation errors.
This creates a visual pipeline showing progress through the test creation flow.