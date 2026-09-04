import { describe, it, expect } from 'vitest';
import { bar, pad, padLeft, spinner, SPINNER_FRAMES, chunk, line, plain } from './ansi';

describe('bar', () => {
  it('renders the requested width', () => {
    expect(bar(0.5, 10)).toHaveLength(10);
    expect(bar(0, 24)).toHaveLength(24);
    expect(bar(1, 24)).toHaveLength(24);
  });

  it('fills proportionally to the ratio', () => {
    const half = bar(0.5, 10);
    expect([...half].filter((c) => c === '█')).toHaveLength(5);
    expect([...bar(1, 10)].every((c) => c === '█')).toBe(true);
    expect([...bar(0, 10)].some((c) => c === '█')).toBe(false);
  });

  it('clamps out-of-range ratios', () => {
    expect(bar(-3, 8)).toEqual(bar(0, 8));
    expect(bar(4.2, 8)).toEqual(bar(1, 8));
  });
});

describe('pad', () => {
  it('pads short strings to the target width', () => {
    expect(pad('ab', 5)).toBe('ab   ');
    expect(padLeft('ab', 5)).toBe('   ab');
  });

  it('truncates strings longer than the target width', () => {
    expect(pad('abcdef', 4)).toHaveLength(4);
    expect(padLeft('abcdef', 4)).toHaveLength(4);
  });
});

describe('spinner', () => {
  it('cycles through the frame list', () => {
    expect(spinner(0)).toBe(SPINNER_FRAMES[0]);
    expect(spinner(SPINNER_FRAMES.length)).toBe(SPINNER_FRAMES[0]);
    expect(spinner(SPINNER_FRAMES.length + 1)).toBe(SPINNER_FRAMES[1]);
  });
});

describe('line builders', () => {
  it('chunk() defaults to the default tone', () => {
    expect(chunk('hi')).toEqual({ text: 'hi', tone: 'default' });
    expect(chunk('hi', 'err')).toEqual({ text: 'hi', tone: 'err' });
  });

  it('line() keeps the id and chunks', () => {
    const l = line('x1', [chunk('a'), chunk('b', 'ok')]);
    expect(l.id).toBe('x1');
    expect(l.chunks).toHaveLength(2);
  });

  it('plain() flattens a line back to text', () => {
    expect(plain(line('x', [chunk('foo '), chunk('bar', 'ok')]))).toBe('foo bar');
  });
});
