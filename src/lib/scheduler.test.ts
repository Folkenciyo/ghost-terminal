import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { pickWeighted, pushRecent } from './scheduler';

const items = [
  { id: 'a', weight: 1 },
  { id: 'b', weight: 1 },
  { id: 'c', weight: 1 },
  { id: 'd', weight: 1 },
  { id: 'e', weight: 1 },
  { id: 'f', weight: 1 },
];

describe('pushRecent', () => {
  it('returns a new array capped at the window size', () => {
    const start: readonly string[] = ['a', 'b'];
    const out = pushRecent(start, 'c', 2);
    expect(out).toEqual(['b', 'c']);
    expect(start).toEqual(['a', 'b']);
  });
});

describe('pickWeighted', () => {
  it('never returns an item present in the recent window', () => {
    const rng = createRng(5);
    let recent: readonly string[] = [];
    for (let i = 0; i < 500; i++) {
      const picked = pickWeighted(items, recent, rng, 3);
      expect(recent).not.toContain(picked.id);
      recent = pushRecent(recent, picked.id, 3);
    }
  });

  it('eventually returns every item', () => {
    const rng = createRng(6);
    let recent: readonly string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const picked = pickWeighted(items, recent, rng, 3);
      seen.add(picked.id);
      recent = pushRecent(recent, picked.id, 3);
    }
    expect(seen.size).toBe(items.length);
  });

  it('falls back to the full pool when the window excludes everything', () => {
    const rng = createRng(7);
    const two = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }];
    const picked = pickWeighted(two, ['a', 'b'], rng, 4);
    expect(['a', 'b']).toContain(picked.id);
  });

  it('respects weights', () => {
    const rng = createRng(8);
    const skewed = [{ id: 'rare', weight: 1 }, { id: 'common', weight: 20 }];
    const counts: Record<string, number> = { rare: 0, common: 0 };
    for (let i = 0; i < 2000; i++) counts[pickWeighted(skewed, [], rng, 0).id]++;
    expect(counts.common).toBeGreaterThan(counts.rare * 4);
  });

  it('is deterministic for a given seed', () => {
    const run = () => {
      const rng = createRng(99);
      return Array.from({ length: 30 }, () => pickWeighted(items, [], rng, 0).id);
    };
    expect(run()).toEqual(run());
  });
});
