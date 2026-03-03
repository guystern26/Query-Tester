### 17. Debounce Strategy & Remaining Hooks


**17.1 Why Debounce Matters (JSON Editor)**
The JSON editor stores raw text in jsonContent. Without debounce, every keystroke triggers a Zustand state update, which causes the entire store to run selectors and potentially re-render multiple components. For a 500-line JSON paste, that's hundreds of updates in milliseconds.

**The pattern: local state for instant feedback, debounced store update for persistence.**

```
const JsonInputView = ({ scenarioId, inputId }) => {
const storeValue = useTestStore(selectInput(scenarioId, inputId))?.jsonContent;
const { updateInput } = useTestStore();
```

```
// Local state for instant typing feedback
const [localValue, setLocalValue] = useState(storeValue ?? '');
const [jsonError, setJsonError] = useState<string | null>(null);
```

```
// Sync from store → local when store changes externally (e.g., file upload)
useEffect(() => { setLocalValue(storeValue ?? ''); }, [storeValue]);
```

```
// Debounced store update (300ms)
const debouncedUpdate = useRef(
debounce((value: string) => {
updateInput(scenarioId, inputId, { jsonContent: value });
}, 300)
).current;
```

```
const handleChange = (text: string) => {
setLocalValue(text);          // instant UI update
debouncedUpdate(text);         // delayed store update
// Validate for UI feedback
try { JSON.parse(text); setJsonError(null); }
catch (e) { setJsonError((e as Error).message); }
};
// ...
};
```

*Import debounce from lodash/debounce or use a simple setTimeout-based implementation (< 10 lines). No need for a full library.*

**17.2 useSavedSearches Hook**
This is the one hook that stays outside the store. It handles async data fetching, which doesn't belong in Zustand (Zustand is for synchronous state).

```
// features/query/useSavedSearches.ts
```

```
interface SavedSearch {
name: string;
type: string;              // 'alert' | 'report' | 'search'
}
```

```
interface UseSavedSearchesReturn {
savedSearches: SavedSearch[];
loading: boolean;
error: string | null;
refetch: () => void;
}
```

```
export function useSavedSearches(app: string | undefined): UseSavedSearchesReturn {
const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

```
const fetchSearches = useCallback(async () => {
if (!app) { setSavedSearches([]); return; }
setLoading(true);
setError(null);
try {
const results = await splunkApi.getSavedSearches(app);
setSavedSearches(results);
} catch (e) {
setError((e as Error).message);
} finally {
setLoading(false);
}
}, [app]);
```

```
// Auto-fetch when app changes
useEffect(() => { fetchSearches(); }, [fetchSearches]);
```

```
return { savedSearches, loading, error, refetch: fetchSearches };
}
```

The SavedSearchPicker component calls this hook, shows a dropdown when loaded, and on selection calls store.loadSavedSearchSpl(name, spl) after fetching the SPL text.

**17.3 SPL Editor**
**Splunk provides a native SPL editor component with syntax highlighting, autocomplete, and command validation.**
The old custom SplEditor with Levenshtein typo detection, manual command highlighting, and warning tooltips is removed. The native Splunk component handles all of this. The SplEditor wrapper simply passes the spl value from the store and calls updateQuery on change (no debounce needed — the native component handles its own internal state).