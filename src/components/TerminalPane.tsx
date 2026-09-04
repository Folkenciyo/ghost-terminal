'use client';

import { useEffect } from 'react';
import { useTerminalStream } from '@/hooks/useTerminalStream';
import { TerminalView } from './TerminalView';

interface TerminalPaneProps {
  readonly seed: number;
  readonly speed: number;
  readonly running: boolean;
  readonly index: number;
  readonly showHeader: boolean;
  readonly className?: string;
  /** Reports scene + line count so the shell can drive the status bar. */
  onStats(index: number, label: string, emitted: number): void;
}

/** A single independent stream. Each pane owns its own engine and scrollback. */
export function TerminalPane({
  seed, speed, running, index, showHeader, className = '', onStats,
}: TerminalPaneProps) {
  const { lines, label, emitted } = useTerminalStream({ seed, speed, running });

  useEffect(() => {
    onStats(index, label, emitted);
  }, [onStats, index, label, emitted]);

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col border-white/10 ${className}`}
      aria-label={`pane ${index + 1}`}
    >
      {showHeader && (
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.16em] sm:px-6">
          <span data-tone="accent">{`pane ${index + 1}`}</span>
          <span data-tone="dim" className="truncate normal-case tracking-normal">
            {label}
          </span>
        </header>
      )}
      <div className="min-h-0 flex-1">
        <TerminalView lines={lines} label={label} />
      </div>
    </section>
  );
}
