/**
 * Scheduled Tests constants.
 */

export const CRON_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Daily 6 AM', value: '0 6 * * *' },
    { label: 'Daily Midnight', value: '0 0 * * *' },
    { label: 'Hourly', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Custom', value: '' },
];

export const MAX_SCHEDULED_TESTS = 50;

export const DEFAULT_ALERT_EMAIL = 't_splunk@souf.org';
