import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, PANE_COUNTS, SPEEDS, parseConfig, paneLayout, nextTheme, isThemeId, THEMES, type ThemeId } from './config';

describe('parseConfig', () => {
  it('falls back to defaults for an empty query', () => {
    expect(parseConfig('')).toEqual(DEFAULT_CONFIG);
    expect(parseConfig('?')).toEqual(DEFAULT_CONFIG);
  });

  it('reads every supported parameter', () => {
    const config = parseConfig('?seed=1234&speed=4&theme=amber&panes=3&kiosk=1');
    expect(config).toEqual({ seed: 1234, speed: 4, theme: 'amber', panes: 3, kiosk: true });
  });

  it('ignores unknown parameters', () => {
    expect(parseConfig('?nope=1&speed=2')).toEqual({ ...DEFAULT_CONFIG, speed: 2 });
  });

  it('rejects a speed that is not on the dial', () => {
    expect(parseConfig('?speed=7').speed).toBe(DEFAULT_CONFIG.speed);
    expect(parseConfig('?speed=abc').speed).toBe(DEFAULT_CONFIG.speed);
    expect(parseConfig('?speed=0.5').speed).toBe(0.5);
  });

  it('rejects an unknown theme', () => {
    expect(parseConfig('?theme=teal').theme).toBe(DEFAULT_CONFIG.theme);
    expect(parseConfig('?theme=matrix').theme).toBe('matrix');
  });

  it('rejects a pane count outside the supported set', () => {
    expect(parseConfig('?panes=9').panes).toBe(DEFAULT_CONFIG.panes);
    expect(parseConfig('?panes=0').panes).toBe(DEFAULT_CONFIG.panes);
    expect(parseConfig('?panes=4').panes).toBe(4);
  });

  it('treats a non-integer seed as absent', () => {
    expect(parseConfig('?seed=abc').seed).toBeNull();
    expect(parseConfig('?seed=12.5').seed).toBeNull();
    expect(parseConfig('?seed=0').seed).toBe(0);
  });

  it('accepts the usual truthy spellings for kiosk', () => {
    expect(parseConfig('?kiosk=1').kiosk).toBe(true);
    expect(parseConfig('?kiosk=true').kiosk).toBe(true);
    expect(parseConfig('?kiosk=0').kiosk).toBe(false);
    expect(parseConfig('?kiosk=nope').kiosk).toBe(false);
  });
});

describe('themes', () => {
  it('offers several distinct themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it('recognises only known theme ids', () => {
    expect(isThemeId('amber')).toBe(true);
    expect(isThemeId('chartreuse')).toBe(false);
  });

  it('cycles through every theme and wraps around', () => {
    const seen = new Set<string>();
    let theme: ThemeId = THEMES[0].id;
    for (let i = 0; i < THEMES.length; i++) {
      seen.add(theme);
      theme = nextTheme(theme);
    }
    expect(seen.size).toBe(THEMES.length);
    expect(theme).toBe(THEMES[0].id);
  });
});

describe('paneLayout', () => {
  it('describes a layout for every supported pane count', () => {
    PANE_COUNTS.forEach((count) => {
      const layout = paneLayout(count);
      expect(layout.count).toBe(count);
      expect(layout.containerClass.length).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) expect(typeof layout.paneClass(i)).toBe('string');
    });
  });

  it('gives the first pane extra room in the three-pane layout', () => {
    expect(paneLayout(3).paneClass(0)).toContain('row-span-2');
    expect(paneLayout(3).paneClass(1)).not.toContain('row-span-2');
  });

  it('keeps a single pane free of grid spanning', () => {
    expect(paneLayout(1).paneClass(0)).toBe('');
  });
});

describe('speed dial', () => {
  it('is ordered, unique and contains the default', () => {
    expect([...SPEEDS]).toEqual([...SPEEDS].sort((a, b) => a - b));
    expect(new Set(SPEEDS).size).toBe(SPEEDS.length);
    expect(SPEEDS).toContain(DEFAULT_CONFIG.speed);
  });
});
