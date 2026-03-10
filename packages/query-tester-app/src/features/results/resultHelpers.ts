/**
 * Shared helpers and constants for the results feature.
 */
import type { ValidationDetail } from 'core/types';

/** Splunk internal fields that should never appear in the results table. */
export const HIDDEN_SPLUNK_FIELDS = new Set([
  'punct', 'source', 'sourcetype', 'splunk_server', 'splunk_server_group',
  'index', 'host', 'linecount', 'timeendpos', 'timestartpos',
  'eventtype', 'tag', 'tag::eventtype',
]);

export const MAX_DISPLAY_ROWS = 100;
export const PAGE_SIZE = 5;
export const MANY_COLUMNS_THRESHOLD = 20;

export function formatMs(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return mins + 'm ' + secs + 's';
}

/** Check if a field is a dynamic run_id injected by the backend (e.g. "run_id_6d1f4ac7"). */
export function isInjectedRunId(key: string): boolean {
  return /^run_id_[0-9a-f]{6,16}$/i.test(key);
}

/** Humanize a condition operator like "is_not_empty" → "is not empty". */
export function humanizeCondition(condition: string): string {
  const MAP: Record<string, string> = {
    equals: 'equals',
    not_equals: 'does not equal',
    contains: 'contains',
    not_contains: 'does not contain',
    starts_with: 'starts with',
    ends_with: 'ends with',
    greater_than: '>',
    less_than: '<',
    greater_than_or_equal: '\u2265',
    less_than_or_equal: '\u2264',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
    matches_regex: 'matches pattern',
    in_list: 'is one of',
    not_in_list: 'is not one of',
  };
  return MAP[condition] || condition.replace(/_/g, ' ');
}

/** Build a map of field → failed validations, for annotating table cells. */
export function buildFieldFailures(validations: ValidationDetail[]): Map<string, ValidationDetail[]> {
  const map = new Map<string, ValidationDetail[]>();
  for (const v of validations) {
    if (v.passed) continue;
    const list = map.get(v.field) || [];
    list.push(v);
    map.set(v.field, list);
  }
  return map;
}

/** Build a short failure reason string for a cell annotation. */
export function cellFailureNote(v: ValidationDetail): string {
  const cond = humanizeCondition(v.condition);
  const needsValue = !['is_empty', 'is_not_empty'].includes(v.condition);
  if (needsValue) {
    return 'Expected ' + cond + ' ' + v.expected;
  }
  return 'Expected ' + cond;
}

/** Client-side condition evaluators — mirrors backend condition_handlers.py */
function safeFloat(s: string): number {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

const CONDITION_EVAL: Record<string, (actual: string, expected: string) => boolean> = {
  equals: (a, e) => a.trim().toLowerCase() === e.trim().toLowerCase(),
  not_equals: (a, e) => a.trim().toLowerCase() !== e.trim().toLowerCase(),
  contains: (a, e) => a.toLowerCase().includes(e.toLowerCase()),
  not_contains: (a, e) => !a.toLowerCase().includes(e.toLowerCase()),
  regex: (a, e) => { try { return new RegExp(e).test(a); } catch { return false; } },
  greater_than: (a, e) => safeFloat(a) > safeFloat(e),
  less_than: (a, e) => safeFloat(a) < safeFloat(e),
  greater_or_equal: (a, e) => safeFloat(a) >= safeFloat(e),
  less_or_equal: (a, e) => safeFloat(a) <= safeFloat(e),
  is_empty: (a) => a.trim() === '',
  is_not_empty: (a) => a.trim() !== '',
  not_empty: (a) => a.trim() !== '',
  in_list: (a, e) => e.split(',').map((v) => v.trim()).includes(a.trim()),
};

/** Evaluate a single condition against one row's actual value. */
export function evaluateCondition(operator: string, actual: string, expected: string): boolean {
  const fn = CONDITION_EVAL[operator];
  if (!fn) return true; // unknown operator → don't flag
  return fn(actual, expected);
}

/** Per-row validation: evaluate all field conditions against one row. */
export function getRowValidation(
  row: Record<string, unknown>,
  validations: ValidationDetail[],
): { passed: boolean; notes: string[] } {
  const notes: string[] = [];
  let allPassed = true;

  for (const v of validations) {
    if (v.field.startsWith('_')) continue;
    const actual = String(row[v.field] ?? '');
    const rowPasses = evaluateCondition(v.condition, actual, v.expected);
    if (!rowPasses) {
      allPassed = false;
      const cond = humanizeCondition(v.condition);
      const exp = v.expected ? ' ' + v.expected : '';
      notes.push(v.field + ': expected ' + cond + exp + ', got "' + (actual || '(empty)') + '"');
    }
  }

  return { passed: allPassed, notes };
}
