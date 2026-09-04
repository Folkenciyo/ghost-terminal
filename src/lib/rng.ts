import type { Rng } from './types';

const HEX_ALPHABET = '0123456789abcdef';
const DEFAULT_SEED = 0x9e3779b9;

/**
 * mulberry32: small, fast, well-distributed 32-bit PRNG.
 * Seeded so every visual sequence is reproducible in tests.
 */
export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || DEFAULT_SEED;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const float = (min: number, max: number, decimals = 2): number =>
    Number((min + next() * (max - min)).toFixed(decimals));

  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];

  const sample = <T,>(items: readonly T[], count: number): T[] => {
    const pool = [...items];
    const wanted = Math.min(count, pool.length);
    for (let i = 0; i < wanted; i++) {
      const j = int(i, pool.length - 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, wanted);
  };

  const chance = (probability: number): boolean => next() < probability;

  const hex = (length: number): string => {
    let out = '';
    for (let i = 0; i < length; i++) out += HEX_ALPHABET[int(0, 15)];
    return out;
  };

  return { next, int, float, pick, sample, chance, hex };
}
