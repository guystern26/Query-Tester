/**
 * Per-scenario color palette. Each scenario gets a unique accent color
 * for its tab, input card borders, and panel background tint.
 */

export interface ScenarioColor {
  /** Active tab text */
  text: string;
  /** Active tab bottom border */
  border: string;
  /** Dot indicator on cards */
  dot: string;
  /** Panel background tint (very subtle) */
  tint: string;
  /** Input card left-border accent */
  cardBorder: string;
}

export const SCENARIO_COLORS: ScenarioColor[] = [
  { text: 'text-blue-400',    border: 'border-blue-500',    dot: 'bg-blue-400',    tint: 'bg-blue-500/5',    cardBorder: 'border-l-blue-500' },
  { text: 'text-green-400',   border: 'border-green-500',   dot: 'bg-green-400',   tint: 'bg-green-500/5',   cardBorder: 'border-l-green-500' },
  { text: 'text-amber-400',   border: 'border-amber-500',   dot: 'bg-amber-400',   tint: 'bg-amber-500/5',   cardBorder: 'border-l-amber-500' },
  { text: 'text-pink-400',    border: 'border-pink-500',    dot: 'bg-pink-400',    tint: 'bg-pink-500/5',    cardBorder: 'border-l-pink-500' },
  { text: 'text-purple-400',  border: 'border-purple-500',  dot: 'bg-purple-400',  tint: 'bg-purple-500/5',  cardBorder: 'border-l-purple-500' },
  { text: 'text-orange-400',  border: 'border-orange-500',  dot: 'bg-orange-400',  tint: 'bg-orange-500/5',  cardBorder: 'border-l-orange-500' },
  { text: 'text-teal-400',    border: 'border-teal-500',    dot: 'bg-teal-400',    tint: 'bg-teal-500/5',    cardBorder: 'border-l-teal-500' },
  { text: 'text-violet-400',  border: 'border-violet-500',  dot: 'bg-violet-400',  tint: 'bg-violet-500/5',  cardBorder: 'border-l-violet-500' },
  { text: 'text-emerald-400', border: 'border-emerald-500', dot: 'bg-emerald-400', tint: 'bg-emerald-500/5', cardBorder: 'border-l-emerald-500' },
  { text: 'text-rose-400',    border: 'border-rose-500',    dot: 'bg-rose-400',    tint: 'bg-rose-500/5',    cardBorder: 'border-l-rose-500' },
];

export function getScenarioColor(index: number): ScenarioColor {
  return SCENARIO_COLORS[index % SCENARIO_COLORS.length];
}
