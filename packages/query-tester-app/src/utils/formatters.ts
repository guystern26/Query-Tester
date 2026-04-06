/**
 * Shared formatting utilities for the library/schedule features.
 */

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;

/** Format an ISO timestamp as a human-readable relative time string. */
export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < MINUTES_PER_HOUR) return mins + 'm ago';
    const hrs = Math.floor(mins / MINUTES_PER_HOUR);
    if (hrs < HOURS_PER_DAY) return hrs + 'h ago';
    const days = Math.floor(hrs / HOURS_PER_DAY);
    if (days < DAYS_PER_MONTH) return days + 'd ago';
    return Math.floor(days / DAYS_PER_MONTH) + 'mo ago';
}

/**
 * Normalize the `enabled` field from KVStore which may be boolean, string
 * "1"/"0", or "true"/"false".
 */
export function normalizeEnabled(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === '1' || value.toLowerCase() === 'true';
    return Boolean(value);
}
