'use client';

import { memo, useEffect, useRef } from 'react';
import type { Line } from '@/lib/types';

interface TerminalViewProps {
  readonly lines: readonly Line[];
  readonly label?: string;
}

/**
 * One row. Memoised on the line reference: the buffer reducer only creates a
 * new object for rows that actually changed, so a progress-bar tick re-renders
 * exactly one row instead of the whole scrollback.
 */
const Row = memo(function Row({ line }: { readonly line: Line }) {
  return (
    <li className="term-row min-h-[1.55em] whitespace-pre-wrap break-all sm:break-normal">
      {line.chunks.map((piece, index) => (
        <span key={index} data-tone={piece.tone} className={piece.bold ? 'font-semibold' : undefined}>
          {piece.text}
        </span>
      ))}
    </li>
  );
});

/** Scrollback pane. Sticks to the bottom as new lines land. */
export function TerminalView({ lines, label }: TerminalViewProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={boxRef}
      role="log"
      aria-live="off"
      aria-label={label ? `${label} — simulated output` : 'Simulated build output'}
      className="term-scroll flex h-full flex-col overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6"
    >
      <ol className="mt-auto w-full font-mono text-[11.5px] leading-[1.55] sm:text-[13px]">
        {lines.map((row) => (
          <Row key={row.id} line={row} />
        ))}
      </ol>
      <span
        aria-hidden="true"
        className="term-cursor mt-0.5 inline-block h-[1.1em] w-[0.6em] shrink-0 bg-[var(--tone-accent)]"
      />
    </div>
  );
}
