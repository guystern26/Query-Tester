/**
 * UI-only destructive command classification.
 * Never sent to backend — used purely for frontend visual indicators.
 */

export const DESTRUCTIVE_COMMANDS = [
    'delete',
    'drop',
    'truncate',
    'rest',
    'sendemail',
    'runshellscript',
];
