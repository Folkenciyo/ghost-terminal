'use client';

import { useEffect, useState } from 'react';

const TABS = ['stream', 'workers', 'telemetry', 'audit'] as const;

/** Window chrome. The clock mounts client-side to keep hydration quiet. */
export function TopBar({ host, session }: { readonly host: string; readonly session: string }) {
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const render = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    render();
    const interval = setInterval(render, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-2 font-mono text-[11px] sm:px-6">
      <span className="flex gap-1.5" aria-hidden="true">
        <i className="size-2.5 rounded-full bg-[#ff5f57]" />
        <i className="size-2.5 rounded-full bg-[#febc2e]" />
        <i className="size-2.5 rounded-full bg-[#28c840]" />
      </span>

      <nav className="ml-2 hidden gap-1 sm:flex" aria-label="Panes">
        {TABS.map((tab, index) => (
          <span
            key={tab}
            data-tone={index === 0 ? 'accent' : 'dim'}
            className={`rounded px-2 py-0.5 ${index === 0 ? 'bg-white/10' : ''}`}
          >
            {tab}
          </span>
        ))}
      </nav>

      <span data-tone="dim" className="ml-auto truncate">
        {host}
        <span className="hidden sm:inline"> · session {session}</span>
      </span>
      <span data-tone="cyan" className="tabular-nums" suppressHydrationWarning>
        {clock ?? '--:--:--'}
      </span>
    </header>
  );
}
