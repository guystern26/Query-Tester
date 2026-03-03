### 2. React 16 Compatibility Constraints

**Splunk supports only React 16.13.1. This is a hard constraint that affects every dependency and pattern choice in this project. This section must be consulted before adding any new dependency.**

**2.1 Environment**

| Constraint | Value |
| --- | --- |
| React | 16.13.1 (NOT 17, NOT 18). Mandatory. |
| React-DOM | 16.13.1 (must match React version) |
| Node.js | 18.12 (closed network, limited packages) |
| Vite | 4.5.x (v5 requires Node 20+) |
| TypeScript | 5.2+ (any recent TS works) |
| Network | Closed network. All packages must be pre-installed. |

**2.2 Dependency Compatibility Matrix**

| Package | Version | Notes |
| --- | --- | --- |
| zustand | ^4.5.x | v4 supports React >=16.8. v5 requires React 18. MUST pin to v4. |
| immer | ^10.x | No React dependency. Works everywhere. |
| @splunk/react-ui | ^4.x | Official Splunk components. Built for React 16. |
| @splunk/themes | ^0.17.x | SplunkThemeProvider wraps app. Dark mode via colorScheme. |
| styled-components | ^5.x | Required by @splunk/react-ui. v5 supports React 16. |
| lucide-react | ^0.263.x | Pin to older version. Recent versions may need React 18. |
| lodash/debounce | ^4.x | No React dependency. Used for JSON editor. |

**2.3 What NOT to Use**

| Package / API | Why |
| --- | --- |
| MUI (@mui/*) | Requires React 17+. Not compatible. |
| zustand v5 | Requires React 18. Use v4 instead. |
| Tailwind CSS | Splunk bundling strips it in production. CSS Modules instead. |
| React.useId() | React 18+ only. Use crypto.randomUUID() for IDs. |
| React.useDeferredValue() | React 18+ only. |
| React.useTransition() | React 18+ only. |
| React.startTransition() | React 18+ only. |
| ReactDOM.createRoot() | React 18+ only. Use ReactDOM.render() instead. |
| Suspense for data | Data fetching Suspense is React 18+. Suspense for lazy is OK (16.6+). |

**2.4 Safe React 16 APIs**
All hooks from React 16.8+: useState, useEffect, useCallback, useMemo, useRef, useReducer, useContext. React.memo (16.6+), React.lazy + Suspense for code splitting (16.6+), React.forwardRef (16.3+), React.createContext (16.3+).

**2.5 ID Generation**
crypto.randomUUID() is a Web API (not React or Node). It works in all modern browsers regardless of React version. For Node.js environments (tests, SSR), it's available in Node 19+. For Node 18, use: crypto.randomUUID() from the 'crypto' module (available as globalThis.crypto?.randomUUID?.() || require('crypto').randomUUID()).

**2.6 App Entry Point**
```
// main.tsx - React 16 style (NOT createRoot)
import React from 'react';
import ReactDOM from 'react-dom';
import SplunkThemeProvider from '@splunk/themes/SplunkThemeProvider';
import App from './App';
```

```
ReactDOM.render(
<SplunkThemeProvider family='enterprise' colorScheme='dark' density='comfortable'>
<App />
</SplunkThemeProvider>,
document.getElementById('root')
);
```

*Note: colorScheme='dark' integrates with Splunk's dark mode and our design tokens. The SplunkThemeProvider gives us access to Splunk's native component styling.*

**2.7 Zustand v4 Syntax (Not v5)**
The store examples in this spec use Zustand v4 syntax. Key differences from v5:
```
// v4 - default export, create() returns hook directly
import create from 'zustand';
import { immer } from 'zustand/middleware/immer';
```

```
const useTestStore = create(
immer((set, get) => ({
// state + actions
}))
);
```