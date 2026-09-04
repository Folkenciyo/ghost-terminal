import type { Rng } from './types';

export interface Weighted {
  readonly id: string;
  readonly weight: number;
}

/** Appends to the recency window, dropping the oldest entry. */
export const pushRecent = (
  recent: readonly string[],
  id: string,
  window: number,
): readonly string[] => (window <= 0 ? [] : [...recent, id].slice(-window));

/**
 * Weighted pick that refuses anything seen in the recency window — this is
 * what keeps the stream from feeling like a loop. Falls back to the full pool
 * when the window would exclude every candidate.
 */
export function pickWeighted<T extends Weighted>(
  items: readonly T[],
  recent: readonly string[],
  rng: Rng,
  window: number,
): T {
  const banned = window > 0 ? recent.slice(-window) : [];
  const candidates = items.filter((item) => !banned.includes(item.id));
  const pool = candidates.length > 0 ? candidates : items;

  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let threshold = rng.next() * total;

  for (const item of pool) {
    threshold -= item.weight;
    if (threshold <= 0) return item;
  }
  return pool[pool.length - 1];
}
