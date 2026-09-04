import type { Rng } from './types';

export interface TypeStep {
  /** Delay before this state is shown. */
  readonly delayMs: number;
  /** What the command line reads at this point — a prefix, or a prefix + typo. */
  readonly text: string;
}

const NEIGHBOURS: Readonly<Record<string, string>> = {
  a: 's', b: 'v', c: 'x', d: 'f', e: 'r', f: 'g', g: 'h', h: 'j', i: 'o',
  j: 'k', k: 'l', l: 'k', m: 'n', n: 'm', o: 'p', p: 'o', q: 'w', r: 't',
  s: 'd', t: 'y', u: 'i', v: 'b', w: 'e', x: 'c', y: 'u', z: 'x',
};

const FAST_MIN = 16;
const FAST_MAX = 42;
const BASE_MIN = 40;
const BASE_MAX = 118;
const THINK_MIN = 190;
const THINK_MAX = 640;
const TYPO_CHANCE = 0.022;
const BURST_CHANCE = 0.22;
const THINK_CHANCE = 0.17;

/**
 * Turns a command into a human-looking keystroke sequence: uneven rhythm,
 * bursts of speed, hesitations before flags and separators, and the occasional
 * mistyped key that gets backspaced on the next beat.
 */
export function typeSequence(command: string, rng: Rng): readonly TypeStep[] {
  if (command.length === 0) return [];

  const steps: TypeStep[] = [];
  let burst = 0;

  for (let index = 0; index < command.length; index++) {
    const char = command[index];
    const previous = command[index - 1];
    const shown = command.slice(0, index + 1);

    if (burst === 0 && rng.chance(BURST_CHANCE)) burst = rng.int(3, 6);

    let delay = burst > 0 ? rng.int(FAST_MIN, FAST_MAX) : rng.int(BASE_MIN, BASE_MAX);
    if (burst > 0) burst -= 1;

    // Hesitate where a person would: after a word, before a flag or a path.
    const atBoundary = previous === ' ' || char === '-' || char === '/' || char === '|';
    if (atBoundary && rng.chance(THINK_CHANCE)) {
      delay = rng.int(THINK_MIN, THINK_MAX);
      burst = 0;
    }

    const typo = NEIGHBOURS[char.toLowerCase()];
    if (typo && index > 0 && rng.chance(TYPO_CHANCE)) {
      steps.push({ delayMs: delay, text: command.slice(0, index) + typo });
      steps.push({ delayMs: rng.int(150, 380), text: command.slice(0, index) });
      delay = rng.int(60, 150);
      burst = 0;
    }

    steps.push({ delayMs: delay, text: shown });
  }

  return steps;
}
