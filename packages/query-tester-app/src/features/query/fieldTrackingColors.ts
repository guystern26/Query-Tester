/**
 * fieldTrackingColors — 10-color palette for field-tracking highlights.
 * Matches the scenario color family (blue, green, amber, pink, purple,
 * orange, teal, violet, emerald, rose). No cyan/sky/indigo.
 */

export interface FieldColor {
    /** CSS class name injected into Ace. */
    cls: string;
    /** Solid color for the underline and legend dot. */
    color: string;
    /** Tailwind class for the legend dot. */
    dot: string;
}

export const FIELD_COLORS: FieldColor[] = [
    { cls: 'spl-field-0', color: '#60a5fa', dot: 'bg-blue-400' },
    { cls: 'spl-field-1', color: '#4ade80', dot: 'bg-green-400' },
    { cls: 'spl-field-2', color: '#fbbf24', dot: 'bg-amber-400' },
    { cls: 'spl-field-3', color: '#f472b6', dot: 'bg-pink-400' },
    { cls: 'spl-field-4', color: '#c084fc', dot: 'bg-purple-400' },
    { cls: 'spl-field-5', color: '#fb923c', dot: 'bg-orange-400' },
    { cls: 'spl-field-6', color: '#2dd4bf', dot: 'bg-teal-400' },
    { cls: 'spl-field-7', color: '#a78bfa', dot: 'bg-violet-400' },
    { cls: 'spl-field-8', color: '#6ee7b7', dot: 'bg-emerald-400' },
    { cls: 'spl-field-9', color: '#fda4af', dot: 'bg-rose-400' },
];

export function getFieldColor(index: number): FieldColor {
    return FIELD_COLORS[index % FIELD_COLORS.length];
}
