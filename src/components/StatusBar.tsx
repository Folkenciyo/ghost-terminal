'use client';

import { spinner } from '@/lib/ansi';
import { PANE_COUNTS, SPEEDS, THEMES, type PaneCount, type ThemeId } from '@/lib/config';

interface StatusBarProps {
  readonly label: string;
  readonly running: boolean;
  readonly speed: number;
  readonly panes: PaneCount;
  readonly theme: ThemeId;
  readonly emitted: number;
  readonly tick: number;
  onToggle(): void;
  onSpeed(speed: number): void;
  onPanes(panes: PaneCount): void;
  onTheme(): void;
  onFullscreen(): void;
}

const CONTROL =
  'rounded border border-white/15 px-2 py-0.5 transition-colors hover:border-white/40 hover:bg-white/5 aria-pressed:border-transparent aria-pressed:bg-white/15';

/** Bottom chrome: what is running, how fast, how many panes, which theme. */
export function StatusBar({
  label, running, speed, panes, theme, emitted, tick,
  onToggle, onSpeed, onPanes, onTheme, onFullscreen,
}: StatusBarProps) {
  const themeLabel = THEMES.find((entry) => entry.id === theme)?.label ?? theme;

  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 bg-black/40 px-4 py-2 font-mono text-[11px] sm:px-6">
      <span className="flex items-center gap-2">
        <span data-tone="accent" aria-hidden="true" className="w-3">
          {running ? spinner(tick) : '‖'}
        </span>
        <span data-tone={running ? 'ok' : 'warn'}>{running ? label : `${label} (paused)`}</span>
      </span>

      <span data-tone="dim" className="tabular-nums">
        {emitted.toLocaleString('en-US')} lines
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <button type="button" onClick={onToggle} aria-label={running ? 'Pause stream' : 'Resume stream'} className={CONTROL}>
          {running ? 'pause' : 'resume'}
        </button>

        <span data-tone="dim" className="ml-2 hidden sm:inline">speed</span>
        {SPEEDS.map((value) => (
          <button key={value} type="button" onClick={() => onSpeed(value)} aria-pressed={speed === value} className={CONTROL}>
            {value}x
          </button>
        ))}

        <span data-tone="dim" className="ml-2 hidden sm:inline">panes</span>
        {PANE_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onPanes(count)}
            aria-pressed={panes === count}
            aria-label={`${count} pane${count === 1 ? '' : 's'}`}
            className={CONTROL}
          >
            {count}
          </button>
        ))}

        <button type="button" onClick={onTheme} aria-label="Change theme" className={`${CONTROL} ml-2`}>
          {themeLabel}
        </button>
        <button type="button" onClick={onFullscreen} aria-label="Toggle fullscreen" className={CONTROL}>
          ⛶
        </button>
      </div>
    </footer>
  );
}
