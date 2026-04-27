/**
 * Scheduled Tests constants.
 */

/** Pick a deterministic hour from a range, seeded by minute to spread load. */
function hourFromRange(minute: number, start: number, end: number): number {
    return start + (minute % (end - start + 1));
}

export const SCHEDULE_INTERVALS: ReadonlyArray<{
    label: string;
    key: string;
    description: string;
    buildCron: (minute: number) => string;
}> = [
    { label: 'Daily (morning)',  key: 'daily',   description: 'Runs once a day, 06:00–09:00',   buildCron: (m) => `${m} ${hourFromRange(m, 6, 9)} * * *` },
    { label: 'Every 2 days',     key: '2d',      description: 'Runs every 2 days, 06:00–09:00', buildCron: (m) => `${m} ${hourFromRange(m, 6, 9)} */2 * *` },
    { label: 'Every 3 days',     key: '3d',      description: 'Runs every 3 days, 06:00–09:00', buildCron: (m) => `${m} ${hourFromRange(m, 6, 9)} */3 * *` },
    { label: 'Daily (evening)',  key: 'evening', description: 'Runs once a day, 18:00–21:00',   buildCron: (m) => `${m} ${hourFromRange(m, 18, 21)} * * *` },
    { label: 'Weekly',           key: 'weekly',  description: 'Runs once on the weekend (Fri evening – Sun morning)', buildCron: (m) => `${m} 22 * * 5` },
];

export const MAX_SCHEDULED_TESTS = 50;

export const DEFAULT_ALERT_EMAIL = 'admin@example.com';
