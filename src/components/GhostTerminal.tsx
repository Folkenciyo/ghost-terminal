'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGauges } from '@/hooks/useGauges';
import {
  DEFAULT_CONFIG, SPEEDS, PANE_COUNTS, nextTheme, paneLayout, parseConfig, isThemeId,
  type PaneCount, type ThemeId,
} from '@/lib/config';
import { GaugeRail } from './GaugeRail';
import { StatusBar } from './StatusBar';
import { TerminalPane } from './TerminalPane';
import { TopBar } from './TopBar';

const SPINNER_INTERVAL_MS = 90;
const JOB_HISTORY = 7;
const IDLE_CURSOR_MS = 3000;
const SEED_STRIDE = 7919;
const THEME_STORAGE_KEY = 'ghost-terminal:theme';

type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> };
};

interface PaneStats {
  readonly jobs: readonly string[];
  readonly report: (index: number, label: string, emitted: number) => void;
  readonly totalEmitted: () => number;
}

/**
 * Collects what the panes are doing. Labels drive the job feed through state;
 * line counts land in a ref so a new line never re-renders the shell — the
 * spinner tick is what repaints the counter.
 */
function usePaneStats(): PaneStats {
  const [jobs, setJobs] = useState<readonly string[]>([]);
  const emittedRef = useRef<number[]>([]);

  const report = useCallback((index: number, label: string, emitted: number) => {
    emittedRef.current[index] = emitted;
    setJobs((prev) =>
      prev[0] === label ? prev : [label, ...prev.filter((job) => job !== label)].slice(0, JOB_HISTORY),
    );
  }, []);

  const totalEmitted = useCallback(
    () => emittedRef.current.reduce((sum, value) => sum + (value ?? 0), 0),
    [],
  );

  return { jobs, report, totalEmitted };
}

/** Hides the pointer while nobody moves it — only meaningful in kiosk mode. */
function useIdlePointer(active: boolean): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!active) return;
    let timer = setTimeout(() => setIdle(true), IDLE_CURSOR_MS);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_CURSOR_MS);
    };
    window.addEventListener('pointermove', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
    };
  }, [active]);

  return active && idle;
}

interface ShellState {
  readonly seed: number | null;
  readonly speed: number;
  readonly panes: PaneCount;
  readonly theme: ThemeId;
  readonly kiosk: boolean;
}

const INITIAL_SHELL: ShellState = {
  seed: null,
  speed: DEFAULT_CONFIG.speed,
  panes: DEFAULT_CONFIG.panes,
  theme: DEFAULT_CONFIG.theme,
  kiosk: DEFAULT_CONFIG.kiosk,
};

export function GhostTerminal({ host, session }: { readonly host: string; readonly session: string }) {
  const [shell, setShell] = useState<ShellState>(INITIAL_SHELL);
  const { seed: baseSeed, speed, panes, theme, kiosk } = shell;
  const setSpeed = useCallback((value: number) => setShell((prev) => ({ ...prev, speed: value })), []);
  const setPanes = useCallback((value: PaneCount) => setShell((prev) => ({ ...prev, panes: value })), []);
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const { jobs, report, totalEmitted } = usePaneStats();

  const [emittedTotal, setEmittedTotal] = useState(0);
  const gauges = useGauges();
  const idlePointer = useIdlePointer(kiosk);
  const layout = useMemo(() => paneLayout(panes), [panes]);

  // URL wins over stored preference, both applied once on the client so the
  // first paint still matches the server markup.
  useEffect(() => {
    const config = parseConfig(window.location.search);
    const seed = config.seed ?? Math.floor(Math.random() * 2 ** 31);

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const themeFromUrl = new URLSearchParams(window.location.search).has('theme');
    const theme = themeFromUrl ? config.theme : stored && isThemeId(stored) ? stored : config.theme;

    // Browser-only state (URL + storage) has to land after hydration, or the
    // first client render would not match the server markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShell({ seed, speed: config.speed, panes: config.panes, kiosk: config.kiosk, theme });
  }, []);

  // One heartbeat drives the spinner and samples the pane counters, so a new
  // line never re-renders the shell on its own.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
      setEmittedTotal(totalEmitted());
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [totalEmitted]);

  const cycleTheme = useCallback(() => {
    setShell((prev) => {
      const next = nextTheme(prev.theme);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Private mode or blocked storage: the theme simply will not persist.
      }
      return { ...prev, theme: next };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      setShell((prev) => ({ ...prev, kiosk: false }));
      return;
    }
    document.documentElement.requestFullscreen?.().catch(() => {});
    setShell((prev) => ({ ...prev, kiosk: true }));
  }, []);

  useEffect(() => {
    if (!kiosk) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let released = false;
    let sentinel: { release(): Promise<void> } | null = null;
    nav.wakeLock
      .request('screen')
      .then((lock) => {
        if (released) lock.release().catch(() => {});
        else sentinel = lock;
      })
      .catch(() => {});

    return () => {
      released = true;
      sentinel?.release().catch(() => {});
    };
  }, [kiosk]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLButtonElement) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setRunning((prev) => !prev);
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= SPEEDS.length) {
        setSpeed(SPEEDS[digit - 1]);
        return;
      }
      if (event.key === 'p' || event.key === 'P') {
        setShell((prev) => ({
          ...prev,
          panes: PANE_COUNTS[(PANE_COUNTS.indexOf(prev.panes) + 1) % PANE_COUNTS.length],
        }));
        return;
      }
      if (event.key === 't' || event.key === 'T') cycleTheme();
      if (event.key === 'f' || event.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleTheme, toggleFullscreen, setSpeed]);

  const uptime = Math.floor(tick / 11);

  return (
    <div
      data-theme={theme}
      className={`crt flex h-dvh flex-col overflow-hidden bg-[var(--surface)] ${idlePointer ? 'cursor-none' : ''}`}
    >
      <TopBar host={host} session={session} />

      <div className="flex min-h-0 flex-1">
        <main className={`grid min-h-0 min-w-0 flex-1 gap-px bg-white/10 ${layout.containerClass}`}>
          {baseSeed === null
            ? null
            : Array.from({ length: panes }, (_, index) => (
                <TerminalPane
                  key={`${baseSeed}-${index}`}
                  index={index}
                  seed={baseSeed + index * SEED_STRIDE}
                  speed={speed}
                  running={running}
                  showHeader={panes > 1}
                  className={`bg-[var(--surface)] ${layout.paneClass(index)}`}
                  onStats={report}
                />
              ))}
        </main>

        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-l border-white/10 bg-black/25 px-4 py-4 lg:flex">
          <section>
            <h2 data-tone="dim" className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]">
              telemetry
            </h2>
            <GaugeRail gauges={gauges} />
          </section>

          <section className="min-h-0">
            <h2 data-tone="dim" className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]">
              job feed
            </h2>
            <ul aria-label="job feed" className="flex flex-col gap-1.5 font-mono text-[11px]">
              {jobs.map((job, index) => (
                <li key={job} className="flex items-start gap-2 truncate">
                  <span data-tone={index === 0 ? 'accent' : 'ok'}>{index === 0 ? '▸' : '✓'}</span>
                  <span data-tone={index === 0 ? 'default' : 'dim'} className="truncate">
                    {job}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-auto font-mono text-[10px]">
            <p data-tone="dim">
              uptime <span data-tone="cyan">{uptime}s</span>
            </p>
            <p data-tone="dim">
              streams <span data-tone="cyan">{panes} active</span>
            </p>
            <p data-tone="dim" className="mt-2 leading-relaxed">
              space · pause<br />
              1-5 · speed<br />
              p · panes &nbsp; t · theme &nbsp; f · fullscreen
            </p>
          </section>
        </aside>
      </div>

      <StatusBar
        label={jobs[0] ?? 'booting'}
        running={running}
        speed={speed}
        panes={panes}
        theme={theme}
        emitted={emittedTotal}
        tick={tick}
        onToggle={() => setRunning((prev) => !prev)}
        onSpeed={setSpeed}
        onPanes={setPanes}
        onTheme={cycleTheme}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}
