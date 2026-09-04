import type { Line, Op } from './types';

/** How many rows the terminal keeps before scrolling old output away. */
export const MAX_LINES = 400;

/**
 * Folds a batch of ops onto the buffer. Always returns a fresh array
 * (except for the no-op case) so React can rely on reference equality.
 */
export function applyOps(
  lines: readonly Line[],
  ops: readonly Op[],
  max: number = MAX_LINES,
): readonly Line[] {
  if (ops.length === 0) return lines;

  let next: Line[] = [...lines];

  for (const op of ops) {
    if (op.kind === 'clear') {
      next = [];
      continue;
    }
    if (op.kind === 'append') {
      next.push(op.line);
      continue;
    }
    const index = next.findIndex((l) => l.id === op.line.id);
    if (index === -1) next.push(op.line);
    else next[index] = op.line;
  }

  return next.length > max ? next.slice(next.length - max) : next;
}
