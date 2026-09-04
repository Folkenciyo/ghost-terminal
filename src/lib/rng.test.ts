import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('diverges for different seeds', () => {
    const a = Array.from({ length: 20 }, () => createRng(1).next());
    const b = Array.from({ length: 20 }, () => createRng(2).next());
    expect(a).not.toEqual(b);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays within inclusive bounds', () => {
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('int() covers every value of a small range', () => {
    const rng = createRng(11);
    const seen = new Set(Array.from({ length: 300 }, () => rng.int(0, 2)));
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('pick() only returns members of the source array', () => {
    const rng = createRng(13);
    const src = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(src).toContain(rng.pick(src));
  });

  it('chance(1) is always true and chance(0) always false', () => {
    const rng = createRng(17);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(1)).toBe(true);
      expect(rng.chance(0)).toBe(false);
    }
  });

  it('sample() returns n distinct members without mutating the source', () => {
    const rng = createRng(19);
    const src = ['a', 'b', 'c', 'd', 'e'];
    const copy = [...src];
    const out = rng.sample(src, 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((v) => expect(src).toContain(v));
    expect(src).toEqual(copy);
  });

  it('sample() clamps n to the source length', () => {
    const rng = createRng(23);
    expect(rng.sample(['a', 'b'], 9)).toHaveLength(2);
  });

  it('float() respects bounds and decimal places', () => {
    const rng = createRng(29);
    for (let i = 0; i < 200; i++) {
      const v = rng.float(1, 2, 2);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(2);
      expect(String(v).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    }
  });

  it('hex() returns lowercase hex of the requested length', () => {
    const rng = createRng(31);
    expect(rng.hex(7)).toMatch(/^[0-9a-f]{7}$/);
    expect(rng.hex(40)).toMatch(/^[0-9a-f]{40}$/);
  });
});
