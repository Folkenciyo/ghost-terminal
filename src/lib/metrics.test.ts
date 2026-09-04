import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { createGauges, stepGauge, stepGauges, HISTORY_LEN } from './metrics';

describe('gauges', () => {
  it('creates labelled gauges with seeded history', () => {
    const gauges = createGauges(createRng(3));
    expect(gauges.length).toBeGreaterThanOrEqual(3);
    gauges.forEach((g) => {
      expect(g.label).toBeTruthy();
      expect(g.history).toHaveLength(HISTORY_LEN);
      expect(g.value).toBeGreaterThanOrEqual(1);
      expect(g.value).toBeLessThanOrEqual(99);
    });
  });

  it('stepGauge returns a new object and keeps the old one intact', () => {
    const rng = createRng(4);
    const [g] = createGauges(rng);
    const next = stepGauge(g, rng);
    expect(next).not.toBe(g);
    expect(next.history).not.toBe(g.history);
    expect(g.history).toHaveLength(HISTORY_LEN);
  });

  it('keeps values clamped and history bounded over a long run', () => {
    const rng = createRng(5);
    let g = createGauges(rng)[0];
    for (let i = 0; i < 5000; i++) {
      g = stepGauge(g, rng);
      expect(g.value).toBeGreaterThanOrEqual(1);
      expect(g.value).toBeLessThanOrEqual(99);
      expect(g.history).toHaveLength(HISTORY_LEN);
      expect(g.history[g.history.length - 1]).toBe(g.value);
    }
  });

  it('actually moves the value over time', () => {
    const rng = createRng(6);
    let g = createGauges(rng)[0];
    const start = g.value;
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      g = stepGauge(g, rng);
      seen.add(g.value);
    }
    expect(seen.size).toBeGreaterThan(5);
    expect([...seen].some((v) => v !== start)).toBe(true);
  });

  it('stepGauges advances every gauge', () => {
    const rng = createRng(7);
    const gauges = createGauges(rng);
    const next = stepGauges(gauges, rng);
    expect(next).toHaveLength(gauges.length);
    next.forEach((g, i) => expect(g).not.toBe(gauges[i]));
  });
});
