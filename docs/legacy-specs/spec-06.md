# Spec 06 -- AI Field Extraction

## Overview

Two AI-powered features reduce manual work by analyzing the SPL query:

1. **Extract Data Sources** -- discovers input fields (what data enters the query)
2. **Suggest Validation Fields** -- discovers output fields (what the query produces)

Both call an OpenAI-compatible chat completions API.

## Configuration

LLM settings come from the admin Setup page (stored in KVStore), with `env.ts` fallback:

| Setting | Source |
|---------|--------|
| `llmEndpoint` | `appConfig` in store (from KVStore or env.ts) |
| `llmModel` | `appConfig` in store |
| `llmMaxTokens` | `appConfig` in store |
| `llmApiKey` | Fetched from `storage/passwords` via `configApi.getSecret()` |

The API key is cached in memory after first fetch and cleared when admin saves new config.

## Feature 1: Extract Data Sources

**Purpose:** SPL -> list of data sources with their fields

**Response shape:**
```ts
interface ExtractedDataSource {
    rowIdentifier: string;   // e.g., "index=_internal"
    fields: string[];        // e.g., ["host", "source", "sourcetype"]
}
```

**Flow:**
1. User clicks "Extract Fields" button (sparkle icon) in Query section
2. SPL sent to LLM with input-focused prompt
3. Response parsed into `ExtractedDataSource[]`
4. Auto-populates scenario inputs: each source becomes a `TestInput` with `rowIdentifier` set and empty `FieldValue` pairs for each field

**Components:** `ExtractFieldsButton.tsx`

## Feature 2: Suggest Validation Fields

**Purpose:** SPL -> flat list of output field names

**Response shape:** `string[]` (e.g., `["host", "count", "status", "avg_duration"]`)

**Flow:**
1. User clicks "Suggest Fields" button in Validation section
2. SPL sent to LLM with output-focused prompt
3. Response parsed as `string[]`
4. Each field creates a `FieldGroup` with field name pre-filled
5. Merges with existing field groups (skips duplicates by field name)

**Components:** `SuggestFieldsButton.tsx`

## API Layer

File: `src/api/llmApi.ts`

```ts
// Core function -- calls OpenAI-compatible chat completions
export async function callLLM(messages, config): Promise<string>;

// Feature 1 -- input field extraction
export async function extractDataSources(spl: string): Promise<ExtractedDataSource[]>;

// Feature 2 -- output field suggestion
export async function extractValidationFields(spl: string): Promise<string[]>;
```

## Error Handling

- 5-second timeout display -- shows loading indicator, auto-dismisses
- Graceful degradation if no LLM is configured (buttons hidden or disabled)
- Parse failures caught and shown as user-friendly error messages
- Network errors do not crash the app -- features are optional enhancements

## Key Difference

| Feature | Direction | Returns | Populates |
|---------|-----------|---------|-----------|
| Extract Data Sources | Input fields | `{rowIdentifier, fields[]}[]` | Scenario inputs |
| Suggest Validation Fields | Output fields | `string[]` | Validation field groups |
