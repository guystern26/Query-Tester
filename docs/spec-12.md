### 12. Component Architecture


```
StartPage                            (dark layout shell)
├─ TopBar                              (always visible, sticky)
│  ├─ SaveButton                       (downloads .json)
│  ├─ LoadButton                       (hidden file input, reads .json)
│  ├─ BugReportButton                  (modal: bug/feature, mailto + JSON)
│  └─ TestNavigation                   (prev/next, name, counter, +/dup/del)
├─ AppChooser                        (Step 1: must select app)
├─ TestTypeSelector                  (2 options: standard | query_only)
├─ QuerySection                      (Step 2: revealed when app selected)
│  ├─ SplEditor                       (native Splunk SPL editor component)
│  ├─ SavedSearchPicker               (loads SPL into editor)
│  └─ ExtractFieldsButton             (AI: extracts row IDs + fields)
├─ ScenarioPanel                     (Step 3: revealed when query filled)
│  └─ ScenarioCard                    (per scenario)
│     └─ InputCard                    (per input)
│        ├─ DataSourceSelector          (hybrid input + AI dropdown)
│        ├─ InputModeToggle             (JSON | Fields | No Events)
│        ├─ JsonInputView               (when json mode)
│        ├─ FieldsInputView             (when fields mode)
│        │  └─ EventRow → FieldValueRow
│        ├─ NoEventsMessage             (when no_events mode)
│        └─ GeneratorPanel
├─ ValidationSection                 (Step 4: revealed when inputs done)
│  ├─ ValidationTypeToggle            (standard | ijump_alert)
│  ├─ SuggestFieldsButton             (AI: suggests validation fields)
│  ├─ FieldConditionEditor            (with FieldNameSelector dropdown)
│  ├─ IjumpValidation                 (locked reason/status, orange theme)
│  ├─ ExpectedResultEditor
│  └─ ResultCountRule
└─ ResultsPanel                      (bottom bar, slides up on results)
├─ RunButton                       (enabled only when all steps done)
└─ ScenarioResultCard              (per-scenario pass/fail)
```