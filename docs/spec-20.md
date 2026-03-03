### 20. Implementation Priority


| # | Phase | What | Why First |
| --- | --- | --- | --- |
| 1 | Types + Defaults | core/types/ with all interfaces + defaults.ts + genId() | Foundation. |
| 2 | Zustand Store | testStore.ts + selectors.ts. npm install zustand immer. | Replaces 4 hooks. |
| 3 | Dark Mode CSS | tokens.css (dark), animations.css, convert shared/ components. | Visual foundation. |
| 4 | Progressive Flow | AppChooser, section reveal logic, step indicators, Run gate. | UX backbone. |
| 5 | Query Rework | SplEditor always visible. SavedSearchPicker loads SPL. App-scoped. | Step 2 of flow. |
| 6 | Scenarios + Inputs | ScenarioPanel, InputCard, three input modes, DataSourceSelector. | Step 3 of flow. |
| 7 | Events + Fields | EventRow, FieldValueRow, field validation rules, no_events mode. | Completes hierarchy. |
| 8 | Validation Rework | ValidationType toggle, iJump, ScenarioScope, FieldNameSelector. | Step 4 of flow. |
| 9 | Results + Errors | TestResponse types, QueryErrorsCard, QueryWarningsCard, ScenarioResultCard, ResultsPanel. | Users see results + errors. |
| 10 | AI Features | llmApi.ts, ExtractFieldsButton, SuggestFieldsButton, prompts. | Power features. |
| 11 | UX Polish | Placeholders, contextual notes, confirmations, limits, pre-flight, cancel button. | Production UX. |
| 12 | Cleanup | Error boundaries, delete monoliths, Zod validation, a11y. | Production ready. |

*End of Specification — v5.1*