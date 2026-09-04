'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyOps } from '@/lib/buffer';
import { createEngine, type Engine } from '@/lib/engine';
import type { Line } from '@/lib/types';

const FIRST_STEP_DELAY_MS = 60;
const MIN_STEP_DELAY_MS = 16;

export interface TerminalStreamOptions {
  /**
   * Fixed seed for reproducible output; omit for "random per pane".
   * Read once per mount — remount the component (React `key`) to reseed.
   */
  readonly seed?: number;
  /** Playback multiplier. Changing it does not restart the stream. */
  readonly speed?: number;
  /** Controlled by the caller so every pane pauses together. */
  readonly running?: boolean;
}

export interface TerminalStream {
  readonly lines: readonly Line[];
  readonly label: string;
  readonly emitted: number;
}

/**
 * Drives one terminal pane: pulls steps off its own engine on a
 * self-rescheduling timer and folds their ops into the line buffer.
 * Nothing runs during SSR, so the first paint matches the server markup.
 */
export function useTerminalStream(options: TerminalStreamOptions = {}): TerminalStream {
  const { seed, speed = 1, running = true } = options;

  const [lines, setLines] = useState<readonly Line[]>([]);
  const [label, setLabel] = useState('booting');
  const [emitted, setEmitted] = useState(0);

  const engineRef = useRef<Engine | null>(null);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const getEngine = useCallback((): Engine => {
    if (!engineRef.current) {
      engineRef.current = createEngine(seed ?? Math.floor(Math.random() * 2 ** 31));
    }
    return engineRef.current;
  }, [seed]);

  useEffect(() => {
    if (!running) return;
    const engine = getEngine();
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const step = engine.next();
      const appended = step.ops.filter((op) => op.kind === 'append').length;

      setLines((prev) => applyOps(prev, step.ops));
      setLabel(engine.currentLabel());
      if (appended > 0) setEmitted((prev) => prev + appended);

      timer = setTimeout(tick, Math.max(MIN_STEP_DELAY_MS, step.delayMs / speedRef.current));
    };

    timer = setTimeout(tick, FIRST_STEP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [running, getEngine]);

  return { lines, label, emitted };
}
