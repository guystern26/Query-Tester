# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Splunk Query Tester — a React app for testing SPL queries with synthetic data before production deployment.

## Commands
- `npm run dev` — Start Vite dev server on localhost:3000
- `npm run build` — TypeScript check + Vite build
- `npx tsc --noEmit` — Type check only

## Hard Constraints
- React 16.13.1. NOT 17 or 18. Use ReactDOM.render(), NEVER createRoot().
- Zustand v4.5.x: `import create from 'zustand'` (default export, NOT named `{ create }`)
- Tailwind CSS v4 for all styling during development. Convert to CSS-in-JS before Splunk deployment.
- @splunk/react-ui NOT available locally. Using Tailwind utility wrappers in common/.
- Node.js 18.12. Vite 4.5.x. Closed network — no CDN imports.
- IDs: crypto.randomUUID()
- tsconfig has `strict: false` and `jsx: "react"` (classic runtime).
- Keep files under 200 lines. Split large files into smaller ones.
- Add TODO comments where @splunk/react-ui should replace local wrappers.

## Path Aliases
Configured in both `vite.config.ts` and `tsconfig.json`:
- `core/*` → `./core/*` (root-level shared logic)
- `@/*` → `packages/playground/src/main/webapp/*`
- `@store/*`, `@api/*`, `@hooks/*`, `@utils/*`, `@common/*`, `@components/*`, `@features/*` — all resolve under webapp/

## Architecture
- Data hierarchy: Test → Scenario[] → TestInput[] → InputEvent[] → FieldValue[]
- State: Single Zustand v4 store with Immer, split into 8 slices under `core/store/slices/`
- Store slices: testSlice, scenarioSlice, inputSlice, querySlice, validationSlice, generatorSlice, runSlice, fileSlice
- Slice helpers in `core/store/slices/helpers.ts` (findTest, findScenario, findInput, deepCloneTestWithNewIds)
- Selectors in `core/store/selectors.ts`. Components use `useTestStore()` with selectors. No prop drilling.
- Only separate hook: `hooks/useSavedSearches.ts`
- testType: 'standard' | 'query_only'. ValidationType: 'standard' | 'ijump_alert'
- rowIdentifier is at INPUT level, not event level.
- Each scenario runs independently. No cartesian product.

## File Structure
Source is split between root-level `core/` and the webapp directory:
```
core/                                  — shared types, constants, store (root level)
  types/index.ts                       — all interfaces and enums
  constants/defaults.ts                — factory functions (genId, createDefault*)
  constants/limits.ts                  — MAX_TESTS=20, MAX_SCENARIOS=10, etc.
  store/testStore.ts                   — main store, combines slices
  store/selectors.ts                   — selector functions
  store/slices/                        — 8 action slices + helpers

utils/payloadBuilder.ts                — builds API payload from TestDefinition

packages/playground/src/main/webapp/   — UI layer
  pages/start/index.tsx                — entry point (ReactDOM.render)
  pages/start/StartPage.tsx            — main horizontal layout
  pages/start/globals.css               — Tailwind imports, custom animations, scrollbar styles
  common/                              — UI wrappers (Button, Card, Modal, Select, etc.)
  components/test-navigation/          — TopBar, TestNavigation, BugReportButton
  components/inputs/                   — FieldValueEditor, JsonInputView
  features/scenarios/                  — ScenarioPanel, InputCard, TestTypeSelector
  features/query/                      — QuerySection
  features/validation/                 — ValidationSection, FieldConditionsGrid, IjumpValidation
  features/results/                    — ResultsPanel, ScenarioResultCard
  features/eventGenerator/             — GeneratorPanel, GeneratorRule, configs/
  api/                                 — splunkApi.ts (mocks), testApi.ts (mocks)
  hooks/useSavedSearches.ts
  utils/preflight.ts                   — validateBeforeRun (pre-flight checks)

docs/                                  — 20 spec files (spec-01.md through spec-20.md)
```

## Key Behaviors
- Field names are SHARED across all events in an input. Editing a field name changes it in every event. Adding/removing a field affects all events.
- Adding an event inherits field names from previous event with empty values.
- Each input starts with 1 event and 1 empty field by default.
- JSON editor uses debounced store update (300ms) with local state for instant feedback.
- Run button uses AbortController. 120s timeout.
- Multivalue results: split on '\n', render each value on its own line.
- All inputs show placeholders, NOT pre-filled defaults. Payload builder applies fallbacks at submission time.
- Progressive flow: App → Query → Data → Validation → Results. Each section reveals after previous is filled.

## Visual Design
- HORIZONTAL layout: main sections side by side, not stacked vertically.
- Tailwind dark theme: bg-slate-950 (page), bg-slate-900 (panels), bg-slate-800 (cards), bg-slate-950 (inputs), text-cyan-400 (accent), border-slate-700 (borders).
- All transitions: 0.2s ease. Subtle box-shadow on cards.
- Professional, clean, Splunk-enterprise feel.
- Tailwind v4 config: `@import "tailwindcss"` in globals.css, `@tailwindcss/postcss` plugin in postcss.config.cjs.

## Build & Deploy
- Build output: `packages/playground/stage/appserver/static/pages/`
- Dev proxy: `/splunkd` → `localhost:8000` (configured in vite.config.ts)
- API mocks are in place; replace with real endpoints when deploying to closed network.
- When on closed network: swap common/ wrappers for real @splunk/react-ui imports.
