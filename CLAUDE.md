# CLAUDE.md — Add/Replace these sections

## CRITICAL CONSTRAINTS — READ BEFORE EVERY CHANGE

### React 16.13.1 — BANNED APIs
NEVER use any of these. They don't exist in React 16:
- `createRoot` / `hydrateRoot` (use `ReactDOM.render()`)
- `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`
- `useInsertionEffect`
- `React.lazy` with `Suspense` for data fetching (only code splitting)
- `startTransition`
- `<StrictMode>` double-render behavior
- Automatic batching (only batches inside event handlers, NOT in promises/timeouts)
- `flushSync`
- `createPortal` is fine (exists since React 16)
- `forwardRef` is fine
- `React.memo` is fine
- `useCallback`, `useMemo`, `useRef`, `useState`, `useEffect`, `useContext` — all fine

### Zustand v4.5.x — Import Style
```ts
// CORRECT
import create from 'zustand';

// WRONG — named export is v5+
import { create } from 'zustand';
```

### Tailwind CSS 3 — NOT v4
- Use `@tailwind base; @tailwind components; @tailwind utilities;` in CSS
- Tailwind v4 uses `@import "tailwindcss"` — DO NOT use that syntax
- `darkMode: 'class'` in config — NOT `darkMode: 'selector'` (v4 syntax)
- All utility classes are v3 compatible

### Custom Colors — NO CYAN
Backgrounds: navy-950/900/800/700 (#0a1628, #162033, #202b43, #2a3a5c)
Accent text: steel-400 (#9BB1BB)
Primary buttons: #60A5FA (blue-400) with text-white. Hover: #93C5FD. Active: #3B82F6.
Text: slate-200 (primary), slate-400 (secondary)
Borders: slate-700

There is NO cyan, sky, or indigo as accent anywhere in this project.

### styled-components v5
Used for common/ wrappers only. New components use Tailwind classes.
Do NOT mix styled-components and Tailwind on the same element.

### Node 18.12 / Vite 4.5.x
- No `using` keyword (requires Node 20+)
- No `import.meta.dirname` (Node 21+)
- No top-level await in modules
- Vite config uses `defineConfig` from 'vite'