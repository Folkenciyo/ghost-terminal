import { chunk } from '../ansi';
import { typeSequence } from '../typewriter';
import type { Chunk, Rng, Step } from '../types';

/**
 * Collects the steps of a single scene. Ids are local to the scene; the engine
 * namespaces them so two runs of the same scene never collide.
 */
export interface Emitter {
  append(delayMs: number, chunks: readonly Chunk[]): string;
  /** Types a shell command out character by character, human rhythm and all. */
  command(rng: Rng, text: string): string;
  update(delayMs: number, id: string, chunks: readonly Chunk[]): void;
  gap(delayMs?: number): void;
  steps(): readonly Step[];
}

export function createEmitter(prefix: string): Emitter {
  const steps: Step[] = [];
  let counter = 0;

  return {
    append(delayMs, chunks) {
      const id = `${prefix}.${counter++}`;
      steps.push({ delayMs, ops: [{ kind: 'append', line: { id, chunks } }] });
      return id;
    },
    command(rng, text) {
      const id = `${prefix}.${counter++}`;
      const render = (typed: string): readonly Chunk[] => [
        chunk('❯ ', 'ok', true),
        chunk(typed, 'default', true),
      ];
      steps.push({ delayMs: 260, ops: [{ kind: 'append', line: { id, chunks: render('') } }] });
      for (const keystroke of typeSequence(text, rng)) {
        steps.push({
          delayMs: keystroke.delayMs,
          ops: [{ kind: 'update', line: { id, chunks: render(keystroke.text) } }],
        });
      }
      steps.push({ delayMs: rng.int(160, 420), ops: [{ kind: 'update', line: { id, chunks: render(text) } }] });
      return id;
    },
    update(delayMs, id, chunks) {
      steps.push({ delayMs, ops: [{ kind: 'update', line: { id, chunks } }] });
    },
    gap(delayMs = 60) {
      const id = `${prefix}.${counter++}`;
      steps.push({ delayMs, ops: [{ kind: 'append', line: { id, chunks: [chunk('')] } }] });
    },
    steps: () => steps,
  };
}

export const OK = '✓';
export const FAIL = '✗';
