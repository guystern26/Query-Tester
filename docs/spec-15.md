### 15. Top Bar & Test Management

The top bar is the persistent header of the application. It contains the global actions (Save, Load, Bug Report) and the test navigation. It is always visible regardless of scroll position or which section the user is working on.

**17.1 Top Bar Layout**
```
┌────────────────────────────────────────────────────────────────┐
│ [Save] [Load] [ὁB]  [◀] Test Name (1/3) [▶]  [+New] [Dup] [Del] │
└────────────────────────────────────────────────────────────────┘
```

Left group: Save, Load, Bug Report. Center/right group: Test navigation with prev/next arrows, editable test name, test counter, New/Duplicate/Delete.

**17.2 Save / Load**
**Save (saveToFile):**
Serializes the entire store state: { version, savedAt, activeTestId, tests[] }.
Downloads as .json file via Blob + URL.createObjectURL.
No transformation needed — the save format IS the state.

**Load (loadFromFile):**
Hidden file input triggered via ref (accept='.json').
Reads file with file.text(), parses with JSON.parse().
Validates version field. Replaces store state.
Resets file input value so same file can be loaded again.
Shows error toast if file is invalid.

**17.3 Bug Report Button**
**A floating bug icon button in the top bar (not bottom-right — moved to the toolbar for consistency).**
On click, opens a modal with:
Toggle between 'Bug Report' and 'Feature Request'.
Text area for description.
Send button that: (1) auto-downloads a JSON file containing the full test state + results, (2) opens the default email client via mailto: with pre-filled subject, body, and a reminder to attach the JSON.
Works fully offline — no external API needed. Designed for closed networks.

```
interface BugReportPayload {
reportGeneratedAt: string;
reportType: 'bug' | 'feature';
description: string;
currentTest: TestDefinition;
allTests?: TestDefinition[];
testResponse?: TestResponse;    // included when results exist
}
```

**17.4 Test Navigation**
Users can have multiple tests open. The navigation provides:
**Prev/Next arrows: **Navigate between tests. Disabled at boundaries.
**Test name input: **Editable inline. Calls updateTestName.
**Counter: **'(1 of 3)' showing position.
**New Test button: **Creates a default test via addTest. Auto-switches to it.
**Duplicate button: **Deep-clones current test with new IDs and ' (Copy)' suffix.
**Delete button: **Removes current test. Disabled when only 1 test. Auto-switches to previous test.

*All these operations are store actions in testStore.ts. The TestNavigation component reads from useTestStore() and calls actions directly — no prop passing needed.*

**17.5 TestTypeSelector**
Two-option selector below the top bar: Standard | Query Only. Sets testType on the active test. When 'query_only', the Scenarios/Inputs section is hidden. Two clickable cards, side by side.