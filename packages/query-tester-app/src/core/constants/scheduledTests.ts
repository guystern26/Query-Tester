/**
 * Scheduled Tests constants.
 */

export const SCHEDULE_INTERVALS: ReadonlyArray<{
    label: string;
    key: string;
    description: string;
    buildCron: (minute: number) => string;
}> = [
    { label: 'Every hour',     key: 'hourly', description: 'Runs once every hour',    buildCron: (m) => `${m} * * * *` },
    { label: 'Every 2 hours',  key: '2h',     description: 'Runs once every 2 hours', buildCron: (m) => `${m} */2 * * *` },
    { label: 'Every 4 hours',  key: '4h',     description: 'Runs once every 4 hours', buildCron: (m) => `${m} */4 * * *` },
    { label: 'Every 6 hours',  key: '6h',     description: 'Runs once every 6 hours', buildCron: (m) => `${m} */6 * * *` },
    { label: 'Every 12 hours', key: '12h',    description: 'Runs twice a day',        buildCron: (m) => `${m} */12 * * *` },
    { label: 'Daily',          key: 'daily',  description: 'Runs once a day',         buildCron: (m) => `${m} 6 * * *` },
];

export const MAX_SCHEDULED_TESTS = 50;

export const DEFAULT_ALERT_EMAIL = 'admin@example.com';
