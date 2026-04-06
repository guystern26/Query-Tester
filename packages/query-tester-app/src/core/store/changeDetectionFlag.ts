/**
 * Shared flag to suppress one change-detection cycle in the testStore subscription.
 * Used by actions that intentionally reset `hasUnsavedChanges` (addTest, resetToNewTest,
 * applyTestToBuilder) so the subscription doesn't immediately re-mark as unsaved.
 *
 * Separate module to avoid circular imports between testStore ↔ slices.
 */

let _skip = 0;

/** Call before a set() that resets hasUnsavedChanges and mutates tests. */
export function skipNextTestsChange(): void {
    _skip++;
}

/** Returns true (and decrements) if a skip was pending. */
export function consumeSkip(): boolean {
    if (_skip > 0) {
        _skip--;
        return true;
    }
    return false;
}
