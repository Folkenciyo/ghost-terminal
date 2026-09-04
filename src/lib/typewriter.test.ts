import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { typeSequence } from './typewriter';

const SAMPLE = 'docker buildx build -t api-gateway:2.4.1 --push .';

const isReachableState = (state: string, target: string): boolean =>
  target.startsWith(state) || target.startsWith(state.slice(0, -1));

describe('typeSequence', () => {
  it('ends on the complete command', () => {
    const steps = typeSequence(SAMPLE, createRng(1));
    expect(steps[steps.length - 1].text).toBe(SAMPLE);
  });

  it('starts from the first character, never mid-word', () => {
    const steps = typeSequence(SAMPLE, createRng(2));
    expect(steps[0].text.length).toBeLessThanOrEqual(1);
  });

  it('only ever shows a prefix, or a prefix plus one mistyped character', () => {
    for (const seed of [1, 2, 3, 5, 8, 13]) {
      typeSequence(SAMPLE, createRng(seed)).forEach((step) => {
        expect(isReachableState(step.text, SAMPLE)).toBe(true);
      });
    }
  });

  it('takes at least one step per character', () => {
    const steps = typeSequence(SAMPLE, createRng(3));
    expect(steps.length).toBeGreaterThanOrEqual(SAMPLE.length);
  });

  it('keeps every delay inside the playable range', () => {
    for (const seed of [4, 9, 21]) {
      typeSequence(SAMPLE, createRng(seed)).forEach((step) => {
        expect(step.delayMs).toBeGreaterThanOrEqual(10);
        expect(step.delayMs).toBeLessThanOrEqual(1600);
      });
    }
  });

  it('varies its rhythm instead of typing at a constant rate', () => {
    const delays = typeSequence(SAMPLE, createRng(7)).map((s) => s.delayMs);
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(delays.length / 3);
    expect(Math.max(...delays) - Math.min(...delays)).toBeGreaterThan(80);
  });

  it('pauses noticeably at least once on a long command', () => {
    const delays = typeSequence(SAMPLE, createRng(11)).map((s) => s.delayMs);
    expect(delays.some((d) => d > 160)).toBe(true);
  });

  it('sometimes mistypes and corrects itself', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
    const withTypos = seeds.filter((seed) =>
      typeSequence(SAMPLE, createRng(seed)).some((step) => !SAMPLE.startsWith(step.text)),
    );
    expect(withTypos.length).toBeGreaterThan(0);
  });

  it('always recovers from a mistype on the very next step', () => {
    for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
      const steps = typeSequence(SAMPLE, createRng(seed));
      steps.forEach((step, index) => {
        if (SAMPLE.startsWith(step.text)) return;
        const next = steps[index + 1];
        expect(next).toBeDefined();
        expect(SAMPLE.startsWith(next.text)).toBe(true);
        expect(next.text).toBe(step.text.slice(0, -1));
      });
    }
  });

  it('is deterministic per seed and varies across seeds', () => {
    expect(typeSequence(SAMPLE, createRng(5))).toEqual(typeSequence(SAMPLE, createRng(5)));
    expect(typeSequence(SAMPLE, createRng(5))).not.toEqual(typeSequence(SAMPLE, createRng(6)));
  });

  it('handles trivial input', () => {
    expect(typeSequence('', createRng(1))).toEqual([]);
    expect(typeSequence('x', createRng(1)).at(-1)?.text).toBe('x');
  });
});
