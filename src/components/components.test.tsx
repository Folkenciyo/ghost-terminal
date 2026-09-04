// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { chunk, line } from '@/lib/ansi';
import { createGauges } from '@/lib/metrics';
import { createRng } from '@/lib/rng';
import { SPEEDS, PANE_COUNTS } from '@/lib/config';
import { TerminalView } from './TerminalView';
import { GaugeRail } from './GaugeRail';
import { StatusBar } from './StatusBar';

describe('TerminalView', () => {
  const lines = [
    line('a', [chunk('npm install', 'ok')]),
    line('b', [chunk('resolving ', 'dim'), chunk('347 packages', 'accent')]),
  ];

  it('renders every line in order', () => {
    render(<TerminalView lines={lines} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('npm install');
    expect(rows[1]).toHaveTextContent('resolving 347 packages');
  });

  it('exposes the stream as a live region for assistive tech', () => {
    render(<TerminalView lines={lines} />);
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
  });

  it('renders an empty buffer without crashing', () => {
    render(<TerminalView lines={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('tags chunks with their tone so the theme can colour them', () => {
    const { container } = render(<TerminalView lines={lines} />);
    expect(container.querySelector('[data-tone="ok"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="accent"]')).not.toBeNull();
  });

  it('names the pane when a label is given', () => {
    render(<TerminalView lines={lines} label="building image" />);
    expect(screen.getByRole('log')).toHaveAccessibleName(/building image/i);
  });
});

describe('GaugeRail', () => {
  const gauges = createGauges(createRng(42));

  it('renders a labelled meter per gauge', () => {
    render(<GaugeRail gauges={gauges} />);
    expect(screen.getAllByRole('meter')).toHaveLength(gauges.length);
    expect(screen.getByText('CPU')).toBeInTheDocument();
  });

  it('reports the current value on each meter', () => {
    render(<GaugeRail gauges={gauges} />);
    const meter = screen.getAllByRole('meter')[0];
    expect(meter).toHaveAttribute('aria-valuenow', String(gauges[0].value));
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders nothing but the frame before gauges exist', () => {
    render(<GaugeRail gauges={[]} />);
    expect(screen.queryAllByRole('meter')).toHaveLength(0);
  });
});

describe('StatusBar', () => {
  const props = {
    label: 'building image',
    running: true,
    speed: 1,
    panes: 1 as const,
    theme: 'phosphor' as const,
    emitted: 1234,
    tick: 3,
    onToggle: vi.fn(),
    onSpeed: vi.fn(),
    onPanes: vi.fn(),
    onTheme: vi.fn(),
    onFullscreen: vi.fn(),
  };

  it('shows the active scene label and counters', () => {
    render(<StatusBar {...props} />);
    expect(screen.getByText(/building image/)).toBeInTheDocument();
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
  });

  it('toggles playback from the pause control', () => {
    const onToggle = vi.fn();
    render(<StatusBar {...props} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('offers a resume control while paused', () => {
    render(<StatusBar {...props} running={false} />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('offers the whole speed dial', () => {
    render(<StatusBar {...props} />);
    SPEEDS.forEach((speed) => {
      expect(screen.getByRole('button', { name: `${speed}x` })).toBeInTheDocument();
    });
  });

  it('marks the active speed and changes it on click', () => {
    const onSpeed = vi.fn();
    render(<StatusBar {...props} speed={2} onSpeed={onSpeed} />);
    expect(screen.getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '8x' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '8x' }));
    expect(onSpeed).toHaveBeenCalledWith(8);
  });

  it('offers a control per pane count', () => {
    const onPanes = vi.fn();
    render(<StatusBar {...props} panes={2} onPanes={onPanes} />);
    PANE_COUNTS.forEach((count) => {
      expect(screen.getByRole('button', { name: new RegExp(`${count} pane`, 'i') })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /2 panes/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /4 panes/i }));
    expect(onPanes).toHaveBeenCalledWith(4);
  });

  it('shows the current theme and cycles it', () => {
    const onTheme = vi.fn();
    render(<StatusBar {...props} theme="amber" onTheme={onTheme} />);
    const button = screen.getByRole('button', { name: /theme/i });
    expect(button).toHaveTextContent('amber');
    fireEvent.click(button);
    expect(onTheme).toHaveBeenCalledTimes(1);
  });

  it('exposes a fullscreen control', () => {
    const onFullscreen = vi.fn();
    render(<StatusBar {...props} onFullscreen={onFullscreen} />);
    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }));
    expect(onFullscreen).toHaveBeenCalledTimes(1);
  });
});
