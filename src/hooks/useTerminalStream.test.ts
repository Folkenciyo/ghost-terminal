// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTerminalStream } from './useTerminalStream';
import { useGauges } from './useGauges';

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useTerminalStream', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts empty so server and client markup agree', () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 1 }));
    expect(result.current.lines).toEqual([]);
    expect(result.current.emitted).toBe(0);
  });

  it('fills the buffer as time passes', async () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 1 }));
    await advance(30_000);
    expect(result.current.lines.length).toBeGreaterThan(3);
  });

  it('caps the buffer during a long run', async () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 3 }));
    await advance(400_000);
    expect(result.current.lines.length).toBeLessThanOrEqual(400);
  });

  it('produces nothing while the caller holds it paused', async () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 5, running: false }));
    await advance(20_000);
    expect(result.current.lines).toEqual([]);
  });

  it('resumes when the caller flips running back on', async () => {
    const { result, rerender } = renderHook(
      ({ running }: { running: boolean }) => useTerminalStream({ seed: 5, running }),
      { initialProps: { running: true } },
    );
    await advance(20_000);
    const before = result.current.lines.length;
    expect(before).toBeGreaterThan(0);

    rerender({ running: false });
    await advance(20_000);
    expect(result.current.lines).toHaveLength(before);

    rerender({ running: true });
    await advance(20_000);
    expect(result.current.lines.length).toBeGreaterThan(before);
  });

  it('emits more output at a higher speed', async () => {
    const slow = renderHook(() => useTerminalStream({ seed: 9, speed: 1 }));
    const fast = renderHook(() => useTerminalStream({ seed: 9, speed: 8 }));
    await advance(20_000);
    expect(fast.result.current.emitted).toBeGreaterThan(slow.result.current.emitted);
  });

  it('applies a speed change without restarting the stream', async () => {
    const { result, rerender } = renderHook(
      ({ speed }: { speed: number }) => useTerminalStream({ seed: 11, speed }),
      { initialProps: { speed: 1 } },
    );
    await advance(20_000);
    const before = result.current.lines.length;
    rerender({ speed: 8 });
    await advance(20_000);
    expect(result.current.lines.length).toBeGreaterThan(before);
  });

  it('exposes the label of the running scene', async () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 13 }));
    await advance(5000);
    expect(result.current.label.length).toBeGreaterThan(2);
  });

  it('replays identically for one seed and differently for another', async () => {
    const render = (seed: number) => renderHook(() => useTerminalStream({ seed }));
    const text = (hook: ReturnType<typeof render>) =>
      hook.result.current.lines.map((l) => l.id).join('|');

    const first = render(21);
    const same = render(21);
    const other = render(22);
    await advance(30_000);

    expect(text(same)).toBe(text(first));
    expect(text(other)).not.toBe(text(first));
  });

  it('counts the lines it has emitted', async () => {
    const { result } = renderHook(() => useTerminalStream({ seed: 19 }));
    await advance(60_000);
    expect(result.current.emitted).toBeGreaterThanOrEqual(result.current.lines.length);
  });

  it('clears its timers on unmount', async () => {
    const { result, unmount } = renderHook(() => useTerminalStream({ seed: 23 }));
    await advance(20_000);
    const seen = result.current.lines.length;
    unmount();
    await advance(30_000);
    expect(result.current.lines).toHaveLength(seen);
  });
});

describe('useGauges', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is populated as soon as it mounts on the client', () => {
    const { result } = renderHook(() => useGauges(7));
    expect(result.current.length).toBeGreaterThanOrEqual(3);
    result.current.forEach((gauge) => {
      expect(gauge.label).toBeTruthy();
      expect(gauge.history.length).toBeGreaterThan(0);
    });
  });

  it('keeps moving over time', async () => {
    const { result } = renderHook(() => useGauges(7));
    await advance(400);
    const first = result.current.map((g) => g.value);
    await advance(6000);
    expect(result.current.map((g) => g.value)).not.toEqual(first);
  });

  it('stops on unmount', async () => {
    const { result, unmount } = renderHook(() => useGauges(7));
    await advance(1000);
    const frozen = result.current.map((g) => g.value);
    unmount();
    await advance(6000);
    expect(result.current.map((g) => g.value)).toEqual(frozen);
  });
});
