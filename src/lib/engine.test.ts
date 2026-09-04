import { describe, it, expect } from 'vitest';
import { createEngine } from './engine';
import { applyOps, MAX_LINES } from './buffer';
import { plain } from './ansi';
import type { Line } from './types';

describe('createEngine', () => {
  it('streams valid steps indefinitely', () => {
    const engine = createEngine(101);
    for (let i = 0; i < 2000; i++) {
      const step = engine.next();
      expect(step.sceneId).toBeTruthy();
      expect(step.delayMs).toBeGreaterThan(0);
      expect(step.ops.length).toBeGreaterThan(0);
    }
  });

  it('produces identical output for two engines with the same seed', () => {
    const one = createEngine(77);
    const two = createEngine(77);
    for (let i = 0; i < 300; i++) expect(one.next()).toEqual(two.next());
  });

  it('produces different output for different seeds', () => {
    const one = createEngine(1);
    const two = createEngine(2);
    const a = Array.from({ length: 100 }, () => JSON.stringify(one.next())).join();
    const b = Array.from({ length: 100 }, () => JSON.stringify(two.next())).join();
    expect(a).not.toBe(b);
  });

  it('does not repeat a scene within the avoidance window', () => {
    const engine = createEngine(303);
    const runs: string[] = [];
    for (let i = 0; i < 4000; i++) {
      const { sceneId } = engine.next();
      if (runs[runs.length - 1] !== sceneId) runs.push(sceneId);
    }
    expect(runs.length).toBeGreaterThan(20);
    runs.forEach((id, i) => {
      expect(runs.slice(Math.max(0, i - 3), i)).not.toContain(id);
    });
  });

  it('exercises most of the scene catalogue over a long run', () => {
    const engine = createEngine(404);
    const seen = new Set<string>();
    for (let i = 0; i < 20000; i++) seen.add(engine.next().sceneId);
    expect(seen.size).toBeGreaterThanOrEqual(30);
  });

  it('keeps a replayed buffer bounded, unique and printable', () => {
    const engine = createEngine(909);
    let lines: readonly Line[] = [];
    for (let i = 0; i < 3000; i++) lines = applyOps(lines, engine.next().ops);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(MAX_LINES);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    lines.forEach((l) => expect(typeof plain(l)).toBe('string'));
  });

  it('rarely repeats the exact same rendered line back to back', () => {
    const engine = createEngine(1234);
    const texts: string[] = [];
    for (let i = 0; i < 1500; i++) {
      engine.next().ops.forEach((op) => {
        if (op.kind === 'append') texts.push(plain(op.line));
      });
    }
    const dupes = texts.filter((t, i) => i > 0 && t === texts[i - 1] && t.trim() !== '');
    expect(dupes.length / texts.length).toBeLessThan(0.05);
  });

  it('generates globally unique line ids across scenes', () => {
    const engine = createEngine(5150);
    const ids = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      engine.next().ops.forEach((op) => {
        if (op.kind === 'append') {
          expect(ids.has(op.line.id)).toBe(false);
          ids.add(op.line.id);
        }
      });
    }
  });
});
