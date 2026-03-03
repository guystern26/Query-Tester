### 10. Directory Structure


```
src/
├─ core/
│  ├─ types/         index.ts, ids.ts, enums.ts, test.ts, scenario.ts,
│  │                generator.ts, validation.ts, results.ts, defaults.ts
│  ├─ store/         testStore.ts, selectors.ts
│  ├─ api/           client.ts, testApi.ts, splunkApi.ts, llmApi.ts
│  └─ styles/        tokens.css, reset.css, animations.css
│
├─ shared/          Button/, Card/, Modal/, JsonEditor/, FileUpload/,
│                  BugReportButton/, TopBar/, index.ts
│
├─ features/
│  ├─ app-chooser/         AppChooser.tsx
│  ├─ test-navigation/     TestNavigation.tsx, TestTypeSelector.tsx
│  ├─ scenarios/           ScenarioPanel, ScenarioCard
│  ├─ inputs/              InputCard, JsonInputView, FieldsInputView,
│  │                        EventRow, FieldValueRow, DataSourceSelector
│  ├─ event-generator/     GeneratorPanel, RuleEditor, weightNormalizer
│  ├─ query/               QuerySection, SplEditor, SavedSearchPicker,
│  │                        splCommands.ts, useSavedSearches.ts, ExtractFieldsButton
│  ├─ validation/          ValidationSection, ValidationTypeToggle,
│  │                        FieldConditionEditor, FieldConditionRow,
│  │                        ExpectedResultEditor, IjumpValidation,
│  │                        ResultCountRule, SuggestFieldsButton, FieldNameSelector
│  └─ results/             ResultsPanel, ScenarioResultCard, RunButton,
│                          QueryErrorsCard, QueryWarningsCard
│
├─ utils/           levenshtein.ts, fileParser.ts, payloadBuilder.ts
├─ mocks/           handlers.ts, browser.ts (dev-only)
├─ App.tsx, main.tsx, vite-env.d.ts
```

**10.1 New Files (vs v3 spec)**

| File | Purpose |
| --- | --- |
| core/api/llmApi.ts | extractDataSources() and extractValidationFields() LLM API calls. |
| core/styles/animations.css | Shared keyframe animations: slide-in, fade-in, pulse, shimmer. |
| features/query/ExtractFieldsButton.tsx | AI button that triggers data source extraction. |
| features/inputs/DataSourceSelector.tsx | Hybrid text input + dropdown for row identifier with extracted sources. |
| features/validation/SuggestFieldsButton.tsx | AI button that triggers validation field suggestion. |
| features/validation/FieldNameSelector.tsx | Hybrid text input + dropdown for field condition name with suggestions. |
| features/validation/ValidationTypeToggle.tsx | Standard vs iJump toggle within validation. |