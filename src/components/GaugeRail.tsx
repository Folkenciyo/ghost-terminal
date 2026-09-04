'use client';

import type { Gauge } from '@/lib/metrics';

interface GaugeRailProps {
  readonly gauges: readonly Gauge[];
}

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 22;

const sparkPoints = (history: readonly number[]): string =>
  history
    .map((value, index) => {
      const x = (index / Math.max(1, history.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - (value / 100) * SPARK_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

/** Right-hand telemetry rail: value, bar and rolling sparkline per metric. */
export function GaugeRail({ gauges }: GaugeRailProps) {
  return (
    <div className="flex flex-col gap-4">
      {gauges.map((gauge) => (
        <div key={gauge.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
            <span data-tone="dim">{gauge.label}</span>
            <span data-tone={gauge.tone} className="tabular-nums">
              {gauge.value}
              <span data-tone="dim" className="ml-0.5 text-[9px]">{gauge.unit}</span>
            </span>
          </div>

          <div
            role="meter"
            aria-label={gauge.label}
            aria-valuenow={gauge.value}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]"
          >
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{ width: `${gauge.value}%`, background: `var(--tone-${gauge.tone})` }}
            />
          </div>

          <svg
            viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="h-5 w-full opacity-70"
          >
            <polyline
              points={sparkPoints(gauge.history)}
              fill="none"
              stroke={`var(--tone-${gauge.tone})`}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
