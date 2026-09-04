// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { GhostTerminal } from './GhostTerminal';
import { TopBar } from './TopBar';

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const press = async (init: KeyboardEventInit) => {
  await act(async () => {
    fireEvent.keyDown(window, init);
  });
};

const setQuery = (search: string) => {
  window.history.replaceState({}, '', `/${search}`);
};

describe('TopBar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the node identity', () => {
    render(<TopBar host="root@edge-fra1" session="abc-123" />);
    expect(screen.getByText(/root@edge-fra1/)).toBeInTheDocument();
    expect(screen.getByText(/abc-123/)).toBeInTheDocument();
  });

  it('renders a placeholder clock before mounting, then a real time', async () => {
    render(<TopBar host="h" session="s" />);
    await advance(1200);
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });
});

describe('GhostTerminal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setQuery('');
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  const setup = () => render(<GhostTerminal host="root@node-sfo3" session="sess-9" />);

  it('streams output into the log', async () => {
    setup();
    await advance(30_000);
    expect(within(screen.getByRole('log')).getAllByRole('listitem').length).toBeGreaterThan(3);
  });

  it('fills the telemetry rail', async () => {
    setup();
    await advance(1000);
    expect(screen.getAllByRole('meter').length).toBeGreaterThanOrEqual(3);
  });

  it('builds a job feed from the scenes it has played', async () => {
    setup();
    await advance(120_000);
    const feed = screen.getByRole('list', { name: /job feed/i });
    expect(within(feed).getAllByRole('listitem').length).toBeGreaterThan(1);
  });

  it('starts as a single pane', async () => {
    setup();
    await advance(1000);
    expect(screen.getAllByRole('log')).toHaveLength(1);
  });

  it('opens the requested number of panes from the control bar', async () => {
    setup();
    await advance(1000);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /3 panes/i }));
    });
    expect(screen.getAllByRole('log')).toHaveLength(3);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /1 pane$/i }));
    });
    expect(screen.getAllByRole('log')).toHaveLength(1);
  });

  it('gives each pane its own independent stream', async () => {
    setup();
    await advance(1000);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /2 panes/i }));
    });
    await advance(40_000);

    const [first, second] = screen.getAllByRole('log');
    expect(first.textContent).not.toBe(second.textContent);
    expect(first.textContent?.length).toBeGreaterThan(0);
    expect(second.textContent?.length).toBeGreaterThan(0);
  });

  it('cycles panes with the p key', async () => {
    setup();
    await advance(1000);
    await press({ key: 'p', code: 'KeyP' });
    expect(screen.getAllByRole('log')).toHaveLength(2);
    await press({ key: 'p', code: 'KeyP' });
    expect(screen.getAllByRole('log')).toHaveLength(3);
  });

  it('pauses and resumes with the space bar', async () => {
    setup();
    await advance(20_000);

    await press({ code: 'Space', key: ' ' });
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    const frozen = within(screen.getByRole('log')).getAllByRole('listitem').length;
    await advance(20_000);
    expect(within(screen.getByRole('log')).getAllByRole('listitem')).toHaveLength(frozen);

    await press({ code: 'Space', key: ' ' });
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('picks a speed from the number keys', async () => {
    setup();
    await advance(1000);
    await press({ key: '5', code: 'Digit5' });
    expect(screen.getByRole('button', { name: '8x' })).toHaveAttribute('aria-pressed', 'true');
    await press({ key: '1', code: 'Digit1' });
    expect(screen.getByRole('button', { name: '0.5x' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cycles and remembers the theme', async () => {
    const { container } = setup();
    await advance(1000);
    const root = container.querySelector('[data-theme]')!;
    expect(root).toHaveAttribute('data-theme', 'phosphor');

    await press({ key: 't', code: 'KeyT' });
    expect(root).toHaveAttribute('data-theme', 'amber');
    expect(window.localStorage.getItem('ghost-terminal:theme')).toBe('amber');
  });

  it('restores the stored theme on the next visit', async () => {
    window.localStorage.setItem('ghost-terminal:theme', 'matrix');
    const { container } = setup();
    await advance(1000);
    expect(container.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'matrix');
  });

  it('applies configuration coming from the URL', async () => {
    setQuery('?panes=4&speed=2&theme=synthwave');
    const { container } = setup();
    await advance(1000);

    expect(screen.getAllByRole('log')).toHaveLength(4);
    expect(screen.getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'synthwave');
  });

  it('lets the URL theme win over the stored one', async () => {
    window.localStorage.setItem('ghost-terminal:theme', 'matrix');
    setQuery('?theme=ice');
    const { container } = setup();
    await advance(1000);
    expect(container.querySelector('[data-theme]')).toHaveAttribute('data-theme', 'ice');
  });

  it('replays the exact same output for a fixed seed', async () => {
    setQuery('?seed=4242');
    const first = setup();
    await advance(40_000);
    const firstText = within(first.getByRole('log')).getAllByRole('listitem').map((n) => n.textContent);
    first.unmount();

    const second = setup();
    await advance(40_000);
    const secondText = within(second.getByRole('log')).getAllByRole('listitem').map((n) => n.textContent);
    expect(secondText).toEqual(firstText);
  });

  it('survives a fullscreen request the browser does not support', async () => {
    setup();
    await advance(1000);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }));
    });
    expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
  });

  it('ignores keystrokes aimed at a button', async () => {
    setup();
    await advance(1000);
    const pause = screen.getByRole('button', { name: /pause/i });
    await act(async () => {
      fireEvent.keyDown(pause, { code: 'Space', key: ' ' });
    });
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
