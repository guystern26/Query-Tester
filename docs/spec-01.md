### 1. Executive Summary

This document is the single source of truth for the Splunk Query Tester frontend. It defines the exact data model, state management, directory layout, payload format, component architecture, UX flow, and AI-assisted features. Written so any developer can pick up, maintain, and extend this project independently.

**Core hierarchy: Test → Scenario[] → TestInput[] → InputEvent[] → FieldValue[]**

**Guiding principles:**
**Readability: **Any file understood in under 2 minutes. Small files, clear names, obvious data flow.
**Payload = Save File: **What you see in state, save to disk, and send to backend is the same shape.
**Progressive Disclosure: **The UI reveals sections step-by-step. User is never overwhelmed.
**AI-Assisted: **LLM extracts row identifiers, input fields, and validation fields from the SPL query.

| Decision | Choice | Why |
| --- | --- | --- |
| State | Zustand + Immer | One file, no prop drilling, Immer kills spread-hell. |
| Styling | CSS Modules + Dark Mode | Survives Splunk bundling. Dark theme throughout. |
| IDs | crypto.randomUUID() | Date.now() collisions eliminated. |
| Layout | Feature-based modules | Each feature owns its components, types, styles. |
| Payload | Unified shape | Save file and API use same interfaces. |
| Execution | Scenarios independent | No combinations. Each scenario runs separately. |
| UX | Progressive horizontal flow | Sections revealed step-by-step. Dark mode. |
| AI Features | LLM field extraction | Auto-populate row IDs, input fields, validation fields. |