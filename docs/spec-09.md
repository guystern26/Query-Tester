### 9. State Management: Zustand + Immer

One store file (core/store/testStore.ts) replaces all 4 current hooks. See v3 spec section 5 for complete store definition with all actions. Key additions in v4:

**setFieldExtraction: **Stores LLM extraction results on the active test.
**selectDataSource: **Sets row identifier + populates event field names from extraction.
**applySuggestedValidationFields: **Adds suggested fields as new FieldConditions (skips duplicates).
**setInputMode: **Handles the three-way toggle: json/fields/no_events. When switching to no_events, hides editor and sets payload to [{}].