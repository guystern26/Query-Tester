# Spec 02 -- React 16 Constraints

## React 16.13.1 -- Hard Requirement

Splunk ships React 16.13.1. This is non-negotiable and affects every dependency choice.

## BANNED APIs (React 17/18/19+)

These do NOT exist in React 16. Using them will fail silently or crash at runtime:

| API | Introduced in |
|-----|---------------|
| `createRoot` / `hydrateRoot` | React 18 |
| `useId` | React 18 |
| `useTransition` / `startTransition` | React 18 |
| `useDeferredValue` | React 18 |
| `useSyncExternalStore` | React 18 |
| `useInsertionEffect` | React 18 |
| `flushSync` | React 18 |
| Automatic batching (in promises/timeouts) | React 18 |
| `React.lazy` + `Suspense` for data fetching | React 18 |

## Safe APIs (React 16.8+)

All standard hooks work: `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useReducer`, `useContext`.

Other safe APIs: `React.memo` (16.6+), `React.forwardRef` (16.3+), `createPortal` (16+), `React.lazy` + `Suspense` for code splitting only (16.6+), `React.createContext` (16.3+).

## Entry Point

Always use `ReactDOM.render()`, never `createRoot()`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(
    <SplunkThemeProvider family="enterprise" colorScheme="dark" density="comfortable">
        <App />
    </SplunkThemeProvider>,
    document.getElementById('root')
);
```

## JSX Runtime

Must use `classic` runtime (not `automatic`). Vite config sets `jsxRuntime: 'classic'`. Every file using JSX must `import React from 'react'`.

## Zustand v4 -- Default Import

```ts
// CORRECT -- v4 default export
import create from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useTestStore = create(
    immer((set, get) => ({
        // state + actions
    }))
);

// WRONG -- { create } is v5+ named export, will fail
import { create } from 'zustand';
```

## ID Generation

Use `crypto.randomUUID()` for all entity IDs. This is a Web API, not React-specific, and works in all modern browsers regardless of React version.

## styled-components v5

Used for `common/` wrapper components only (required by `@splunk/react-ui`). New components use Tailwind CSS classes. Do NOT mix styled-components and Tailwind on the same element.

## Dependency Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| zustand | ^4.5.x | v5 requires React 18 |
| immer | ^10.x | No React dependency |
| @splunk/react-ui | ^4.x | Built for React 16 |
| @splunk/themes | ^0.17.x | SplunkThemeProvider |
| styled-components | ^5.x | Required by @splunk/react-ui |
| lucide-react | ^0.263.x | Pin to older version |

## Forbidden Packages

- **MUI (`@mui/*`)** -- requires React 17+
- **zustand v5** -- requires React 18
- Any package requiring React 17+ peer dependency
