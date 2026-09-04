'use client';

import { useEffect, useRef, useState } from 'react';
import { createGauges, stepGauges, type Gauge } from '@/lib/metrics';
import { createRng } from '@/lib/rng';
import type { Rng } from '@/lib/types';

const GAUGE_INTERVAL_MS = 220;

/**
 * Telemetry rail state. Independent of the terminal panes so the sidebar keeps
 * breathing regardless of how many streams are on screen.
 */
export function useGauges(seed?: number): readonly Gauge[] {
  const [gauges, setGauges] = useState<readonly Gauge[]>([]);
  const rngRef = useRef<Rng | null>(null);

  useEffect(() => {
    const value = seed ?? Math.floor(Math.random() * 2 ** 31);
    rngRef.current = createRng(value ^ 0x5f3759df);
    setGauges(createGauges(rngRef.current));

    const interval = setInterval(() => {
      setGauges((prev) => (prev.length === 0 ? prev : stepGauges(prev, rngRef.current!)));
    }, GAUGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [seed]);

  return gauges;
}
