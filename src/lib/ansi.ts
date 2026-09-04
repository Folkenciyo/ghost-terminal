import type { Chunk, Line, Tone } from './types';

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const BAR_FILL = '█';
const BAR_EMPTY = '░';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Renders a fixed-width progress bar for a 0..1 ratio. */
export const bar = (ratio: number, width: number): string => {
  const filled = Math.round(clamp01(ratio) * width);
  return BAR_FILL.repeat(filled) + BAR_EMPTY.repeat(width - filled);
};

/** Right-pads (or truncates) to an exact width so columns line up. */
export const pad = (text: string, width: number): string =>
  text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);

/** Left-pads (or truncates) to an exact width, for numeric columns. */
export const padLeft = (text: string, width: number): string =>
  text.length >= width ? text.slice(0, width) : ' '.repeat(width - text.length) + text;

/** Cycles the braille spinner; accepts any monotonically rising counter. */
export const spinner = (tick: number): string => {
  const len = SPINNER_FRAMES.length;
  return SPINNER_FRAMES[((tick % len) + len) % len];
};

export const chunk = (text: string, tone: Tone = 'default', bold?: true): Chunk =>
  bold ? { text, tone, bold } : { text, tone };

export const line = (id: string, chunks: readonly Chunk[]): Line => ({ id, chunks });

/** Flattens a line to raw text — used by tests and by copy-to-clipboard. */
export const plain = (source: Line): string => source.chunks.map((c) => c.text).join('');

export const percent = (ratio: number): string => `${Math.round(clamp01(ratio) * 100)}%`;
