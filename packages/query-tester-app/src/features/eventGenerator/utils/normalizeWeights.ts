/**
 * Normalize weights so they sum to 100.
 * If all weights are 0, distributes evenly.
 */
export function normalizeWeights<T extends { weight: number }>(items: T[]): T[] {
  if (items.length === 0) return items;
  if (items.length === 1) return items.map((it) => ({ ...it, weight: 100 }));

  const total = items.reduce((s, it) => s + Math.max(it.weight, 0), 0);

  if (total === 0) {
    const even = Math.floor(100 / items.length);
    const remainder = 100 - even * items.length;
    return items.map((it, i) => ({ ...it, weight: even + (i < remainder ? 1 : 0) }));
  }

  const raw = items.map((it) => ({ ...it, weight: Math.max(Math.round((Math.max(it.weight, 0) / total) * 100), 1) }));

  const sum = raw.reduce((s, it) => s + it.weight, 0);
  if (sum !== 100) {
    let maxIdx = 0;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].weight > raw[maxIdx].weight) maxIdx = i;
    }
    raw[maxIdx] = { ...raw[maxIdx], weight: raw[maxIdx].weight + (100 - sum) };
  }

  return raw;
}

export function genId(): string {
  return crypto.randomUUID();
}
