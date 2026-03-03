# CLAUDE.md — Splunk Query Tester

## Project
Splunk Query Tester — a React app for testing SPL queries with synthetic data before production deployment.

## Hard Constraints
- React 16.13.1. NOT 17 or 18. Use ReactDOM.render(), NEVER createRoot().
- Zustand v4.5.x: `import create from 'zustand'` (default export, NOT named import)
- styled-components v5 for all styling. NO Tailwind. NO MUI.
- @splunk/react-ui NOT available locally. Using styled-components wrappers in common/.
- Node.js 18.12. Vite 4.5.x. Closed network.
- IDs: crypto.randomUUID()

## Commands
- `npm run dev` — Start dev server on localhost:3000
- `npm run build` — TypeScript check + Vite build
- `npx tsc --noEmit` — Type check only

## Architecture
- Data hierarchy: Test -> Scenario[] -> TestInput[] -> InputEvent[] -> FieldValue[]
- State: Single Zustand v4 store with Immer (`core/store/testStore.ts` or slices in `core/store/slices/`)
- Only separate hook: `hooks/useSavedSearches.ts`
- Components use `useTestStore()` with selectors. No prop drilling.
- testType: 'standard' | 'query_only'. ValidationType: 'standard' | 'ijump_alert'
- Each scenario runs independently. No cartesian product.

## File Structure
```
packages/playground/src/main/webapp/
  core/types/index.ts         — all interfaces and enums
  core/constants/defaults.ts  — factory functions
  core/constants/limits.ts    — MAX_TESTS=20, etc.
  core/store/                 — Zustand store (single file or slices/)
  common/                     — UI wrappers (Button, Card, Modal, etc.)
  features/                   — scenarios/, query/, validation/, results/, eventGenerator/
  components/                 — test-navigation/, inputs/
  api/                        — splunkApi.ts (mocks), testApi.ts
  hooks/                      — useSavedSearches.ts
  pages/start/                — index.tsx (entry), StartPage.tsx
```

## Key Behaviors
- Field names are SHARED across all events in an input. Editing a field name changes it in every event. Adding a field adds it to all events. Removing a field removes it from all events.
- Adding an event inherits field names from previous event with empty values.
- Each input starts with 1 event and 1 empty field by default.
- JSON editor uses debounced store update (300ms) with local state.
- Run button uses AbortController. 120s timeout.
- Multivalue results: split on '\n', render each value on its own line.
- All inputs show placeholders, NOT pre-filled defaults.
- Progressive flow: App -> Query -> Data -> Validation -> Results. Each section reveals after previous is filled.

## Visual Design
- HORIZONTAL layout: main sections side by side, not stacked vertically
- Dark theme: bg #1a1a2e, cards #1e2a45, accent #00d4ff, text #e8e8e8
- All transitions: 0.2s ease. Subtle box-shadow on cards.
- Professional, clean, Splunk-enterprise feel. NOT a toy/prototype look.

## Rules
- Never use React 18 APIs (createRoot, useId, useTransition, etc.)
- Never use Tailwind classes
- Never import from @splunk/* (not available locally)
- Always use styled-components or CSS variables from tokens.css
- Keep files under 200 lines. Split large files into smaller ones.
- Add TODO comments where @splunk/react-ui should replace local wrappers
