import type { Rng, Tone } from './types';

/** Samples kept per gauge — drives the sparkline width in the sidebar. */
export const HISTORY_LEN = 48;

const MIN_VALUE = 1;
const MAX_VALUE = 99;

export interface Gauge {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly tone: Tone;
  readonly value: number;
  readonly history: readonly number[];
}

const SPECS: readonly Omit<Gauge, 'value' | 'history'>[] = [
  { key: 'cpu', label: 'CPU', unit: '%', tone: 'accent' },
  { key: 'mem', label: 'MEM', unit: '%', tone: 'cyan' },
  { key: 'net', label: 'NET', unit: 'Mb/s', tone: 'info' },
  { key: 'io', label: 'I/O', unit: 'MB/s', tone: 'magenta' },
  { key: 'gpu', label: 'GPU', unit: '%', tone: 'warn' },
];

const clamp = (value: number): number =>
  Math.min(MAX_VALUE, Math.max(MIN_VALUE, value));

/** Builds the gauge set with a plausible-looking backfilled history. */
export function createGauges(rng: Rng): readonly Gauge[] {
  return SPECS.map((spec) => {
    let value = rng.int(25, 75);
    const history: number[] = [];
    for (let i = 0; i < HISTORY_LEN; i++) {
      value = clamp(value + rng.int(-6, 6));
      history.push(value);
    }
    return { ...spec, value, history };
  });
}

/** Random-walks one gauge forward, returning a new object every time. */
export function stepGauge(gauge: Gauge, rng: Rng): Gauge {
  const drift = rng.chance(0.08) ? rng.int(-24, 24) : rng.int(-7, 7);
  const value = clamp(gauge.value + drift);
  return { ...gauge, value, history: [...gauge.history.slice(1), value] };
}

export const stepGauges = (gauges: readonly Gauge[], rng: Rng): readonly Gauge[] =>
  gauges.map((gauge) => stepGauge(gauge, rng));
