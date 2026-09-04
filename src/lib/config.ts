export const THEMES = [
  { id: 'phosphor', label: 'phosphor' },
  { id: 'amber', label: 'amber' },
  { id: 'matrix', label: 'matrix' },
  { id: 'synthwave', label: 'synthwave' },
  { id: 'ice', label: 'ice' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const SPEEDS = [0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

export const PANE_COUNTS = [1, 2, 3, 4] as const;
export type PaneCount = (typeof PANE_COUNTS)[number];

export interface AppConfig {
  /** Fixed seed from the URL, or null for "random per visit". */
  readonly seed: number | null;
  readonly speed: Speed;
  readonly theme: ThemeId;
  readonly panes: PaneCount;
  readonly kiosk: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  seed: null,
  speed: 1,
  theme: 'phosphor',
  panes: 1,
  kiosk: false,
};

export const isThemeId = (value: string): value is ThemeId =>
  THEMES.some((theme) => theme.id === value);

export const nextTheme = (current: ThemeId): ThemeId => {
  const index = THEMES.findIndex((theme) => theme.id === current);
  return THEMES[(index + 1) % THEMES.length].id;
};

const TRUTHY = ['1', 'true', 'yes', 'on'];

/** Reads `?seed=&speed=&theme=&panes=&kiosk=`; anything invalid falls back. */
export function parseConfig(search: string): AppConfig {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const rawSeed = params.get('seed');
  const seed = rawSeed !== null && /^-?\d+$/.test(rawSeed) ? Number(rawSeed) : DEFAULT_CONFIG.seed;

  const rawSpeed = Number(params.get('speed'));
  const speed = (SPEEDS as readonly number[]).includes(rawSpeed)
    ? (rawSpeed as Speed)
    : DEFAULT_CONFIG.speed;

  const rawTheme = params.get('theme') ?? '';
  const theme = isThemeId(rawTheme) ? rawTheme : DEFAULT_CONFIG.theme;

  const rawPanes = Number(params.get('panes'));
  const panes = (PANE_COUNTS as readonly number[]).includes(rawPanes)
    ? (rawPanes as PaneCount)
    : DEFAULT_CONFIG.panes;

  const kiosk = TRUTHY.includes((params.get('kiosk') ?? '').toLowerCase());

  return { seed, speed, theme, panes, kiosk };
}

export interface PaneLayout {
  readonly count: PaneCount;
  readonly containerClass: string;
  paneClass(index: number): string;
}

const CONTAINERS: Record<PaneCount, string> = {
  1: 'grid-cols-1 grid-rows-1',
  2: 'grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1',
  3: 'grid-cols-1 grid-rows-3 lg:grid-cols-2 lg:grid-rows-2',
  4: 'grid-cols-1 grid-rows-4 lg:grid-cols-2 lg:grid-rows-2',
};

/** Grid recipe per pane count; pane 0 gets the tall slot in the 3-up layout. */
export function paneLayout(count: PaneCount): PaneLayout {
  return {
    count,
    containerClass: CONTAINERS[count],
    paneClass: (index: number) => (count === 3 && index === 0 ? 'lg:row-span-2' : ''),
  };
}
