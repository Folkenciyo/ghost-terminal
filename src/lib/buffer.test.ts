import { describe, it, expect } from 'vitest';
import { applyOps, MAX_LINES } from './buffer';
import { chunk, line } from './ansi';

const mk = (id: string, text = id) => line(id, [chunk(text)]);

describe('applyOps', () => {
  it('appends lines in order', () => {
    const out = applyOps([], [
      { kind: 'append', line: mk('a') },
      { kind: 'append', line: mk('b') },
    ]);
    expect(out.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('never mutates the input array or its lines', () => {
    const start = [mk('a')];
    const frozen = Object.freeze([...start]);
    const out = applyOps(frozen, [{ kind: 'append', line: mk('b') }]);
    expect(frozen).toHaveLength(1);
    expect(out).not.toBe(frozen);
    expect(out).toHaveLength(2);
  });

  it('replaces a line in place on update', () => {
    const start = applyOps([], [
      { kind: 'append', line: mk('a', 'old') },
      { kind: 'append', line: mk('b') },
    ]);
    const out = applyOps(start, [{ kind: 'update', line: mk('a', 'new') }]);
    expect(out.map((l) => l.id)).toEqual(['a', 'b']);
    expect(out[0].chunks[0].text).toBe('new');
    expect(start[0].chunks[0].text).toBe('old');
  });

  it('appends when updating an id that is not present', () => {
    const out = applyOps([mk('a')], [{ kind: 'update', line: mk('zz') }]);
    expect(out.map((l) => l.id)).toEqual(['a', 'zz']);
  });

  it('empties the buffer on clear', () => {
    expect(applyOps([mk('a'), mk('b')], [{ kind: 'clear' }])).toEqual([]);
  });

  it('caps the buffer to the newest lines', () => {
    const ops = Array.from({ length: MAX_LINES + 30 }, (_, i) => ({
      kind: 'append' as const,
      line: mk(`l${i}`),
    }));
    const out = applyOps([], ops);
    expect(out).toHaveLength(MAX_LINES);
    expect(out[out.length - 1].id).toBe(`l${MAX_LINES + 29}`);
  });

  it('honours a custom cap', () => {
    const ops = Array.from({ length: 10 }, (_, i) => ({ kind: 'append' as const, line: mk(`l${i}`) }));
    expect(applyOps([], ops, 4).map((l) => l.id)).toEqual(['l6', 'l7', 'l8', 'l9']);
  });

  it('returns the same reference for an empty op list', () => {
    const start = [mk('a')];
    expect(applyOps(start, [])).toBe(start);
  });
});
