/**
 * Scheduled Tests constants.
 */

export const SCHEDULE_INTERVALS: ReadonlyArray<{
    label: string;
    key: string;
    description: string;
    buildCron: (minute: number) => string;
}> = [
    { label: 'Daily',          key: 'daily',   description: 'Runs once a day',          buildCron: (m) => `${m} 6 * * *` },
    { label: 'Every 2 days',   key: '2d',      description: 'Runs once every 2 days',   buildCron: (m) => `${m} 6 */2 * *` },
    { label: 'Every 3 days',   key: '3d',      description: 'Runs once every 3 days',   buildCron: (m) => `${m} 6 */3 * *` },
    { label: 'Weekly',         key: 'weekly',  description: 'Runs once on the weekend (Fri evening – Sun morning)', buildCron: (m) => `${m} 22 * * 5` },
];

export const MAX_SCHEDULED_TESTS = 50;

export const DEFAULT_ALERT_EMAIL = 'admin@example.com';
