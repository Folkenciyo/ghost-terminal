import { describe, it, expect } from 'vitest';
import { createRng } from '../rng';
import { plain } from '../ansi';
import type { Op, Step } from '../types';
import { SCENES } from './index';

const SEEDS = [1, 2, 3, 17, 404, 9001];

const hasControlChars = (text: string): boolean =>
  [...text].some((c) => c.charCodeAt(0) < 32);

const collect = (steps: readonly Step[]): readonly Op[] => steps.flatMap((s) => [...s.ops]);

const renderable = (ops: readonly Op[]): string =>
  ops.map((op) => (op.kind === 'clear' ? '' : plain(op.line))).join('\n');

describe('scene registry', () => {
  it('registers a healthy number of scenes', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(30);
  });

  it('has unique ids and positive weights', () => {
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    SCENES.forEach((s) => expect(s.weight).toBeGreaterThan(0));
  });
});

describe.each(SCENES.map((s) => [s.id, s] as const))('scene %s', (_id, scene) => {
  it('produces a non-trivial step list for every seed', () => {
    SEEDS.forEach((seed) => {
      const steps = scene.build(createRng(seed));
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(400);
    });
  });

  it('uses sane, non-blocking delays', () => {
    const steps = scene.build(createRng(7));
    steps.forEach((s) => {
      expect(s.delayMs).toBeGreaterThan(0);
      expect(s.delayMs).toBeLessThanOrEqual(1600);
    });
  });

  it('emits at least one appended line and never an empty op list', () => {
    const steps = scene.build(createRng(11));
    steps.forEach((s) => expect(s.ops.length).toBeGreaterThan(0));
    expect(collect(steps).some((o) => o.kind === 'append')).toBe(true);
  });

  it('only updates ids it has appended earlier', () => {
    const steps = scene.build(createRng(13));
    const known = new Set<string>();
    collect(steps).forEach((op) => {
      if (op.kind === 'append') known.add(op.line.id);
      if (op.kind === 'update') expect(known.has(op.line.id)).toBe(true);
    });
  });

  it('never appends the same id twice', () => {
    const steps = scene.build(createRng(23));
    const ids = collect(steps)
      .filter((o) => o.kind === 'append')
      .map((o) => (o.kind === 'append' ? o.line.id : ''));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders printable text without control characters', () => {
    const steps = scene.build(createRng(29));
    collect(steps).forEach((op) => {
      if (op.kind === 'clear') return;
      const text = plain(op.line);
      expect(text.length).toBeLessThanOrEqual(200);
      expect(hasControlChars(text)).toBe(false);
    });
  });

  it('is deterministic for a given seed', () => {
    const a = JSON.stringify(scene.build(createRng(31)));
    const b = JSON.stringify(scene.build(createRng(31)));
    expect(a).toBe(b);
  });

  it('produces different content across seeds', () => {
    const outputs = new Set(SEEDS.map((s) => JSON.stringify(scene.build(createRng(s)))));
    expect(outputs.size).toBeGreaterThan(1);
  });
});

describe('progress-style scenes', () => {
  const withBars = SCENES.filter((s) => s.hasProgress);

  it('marks several scenes as progress driven', () => {
    expect(withBars.length).toBeGreaterThanOrEqual(10);
  });

  it.each(withBars.map((s) => [s.id, s] as const))('%s drives a bar to completion', (_id, scene) => {
    const text = renderable(collect(scene.build(createRng(37))));
    expect(text).toMatch(/100%|done|complete|ok|✔|✓/i);
  });
});
