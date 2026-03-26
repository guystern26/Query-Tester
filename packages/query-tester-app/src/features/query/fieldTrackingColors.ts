/**
 * fieldTrackingColors — 10-color palette for field-tracking highlights.
 * Matches the scenario color family (blue, green, amber, pink, purple,
 * orange, teal, violet, emerald, rose). No cyan/sky/indigo.
 */

export interface FieldColor {
    /** CSS class name injected into Ace. */
    cls: string;
    /** RGBA background for the Ace marker. */
    bg: string;
    /** Solid border color for the legend dot. */
    border: string;
    /** Tailwind class for the legend dot. */
    dot: string;
}

export const FIELD_COLORS: FieldColor[] = [
    { cls: 'spl-field-0', bg: 'rgba(59,130,246,0.18)',  border: '#3b82f6', dot: 'bg-blue-400' },
    { cls: 'spl-field-1', bg: 'rgba(34,197,94,0.18)',   border: '#22c55e', dot: 'bg-green-400' },
    { cls: 'spl-field-2', bg: 'rgba(245,158,11,0.18)',  border: '#f59e0b', dot: 'bg-amber-400' },
    { cls: 'spl-field-3', bg: 'rgba(236,72,153,0.18)',  border: '#ec4899', dot: 'bg-pink-400' },
    { cls: 'spl-field-4', bg: 'rgba(168,85,247,0.18)',  border: '#a855f7', dot: 'bg-purple-400' },
    { cls: 'spl-field-5', bg: 'rgba(249,115,22,0.18)',  border: '#f97316', dot: 'bg-orange-400' },
    { cls: 'spl-field-6', bg: 'rgba(20,184,166,0.18)',  border: '#14b8a6', dot: 'bg-teal-400' },
    { cls: 'spl-field-7', bg: 'rgba(139,92,246,0.18)',  border: '#8b5cf6', dot: 'bg-violet-400' },
    { cls: 'spl-field-8', bg: 'rgba(52,211,153,0.18)',  border: '#34d399', dot: 'bg-emerald-400' },
    { cls: 'spl-field-9', bg: 'rgba(251,113,133,0.18)', border: '#fb7185', dot: 'bg-rose-400' },
];

export function getFieldColor(index: number): FieldColor {
    return FIELD_COLORS[index % FIELD_COLORS.length];
}
