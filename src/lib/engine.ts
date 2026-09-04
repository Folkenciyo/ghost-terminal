import { createRng } from './rng';
import { pickWeighted, pushRecent } from './scheduler';
import { SCENES } from './scenes';
import type { EngineStep, Op, Rng, Scene } from './types';

/** How many recent scenes are blocked from being scheduled again. */
export const AVOID_WINDOW = 4;

export interface Engine {
  /** Next playback step. The stream never ends. */
  next(): EngineStep;
  /** Scene currently on screen — drives the status bar label. */
  currentLabel(): string;
}

const namespaceOps = (ops: readonly Op[], run: number): readonly Op[] =>
  ops.map((op) =>
    op.kind === 'clear'
      ? op
      : { ...op, line: { ...op.line, id: `r${run}:${op.line.id}` } },
  );

/**
 * Endless step stream: picks a scene, replays its steps, then picks another
 * one that has not been seen in the last `AVOID_WINDOW` runs.
 */
export function createEngine(seed: number, scenes: readonly Scene[] = SCENES): Engine {
  const rng: Rng = createRng(seed);
  let recent: readonly string[] = [];
  let queue: EngineStep[] = [];
  let cursor = 0;
  let run = 0;
  let label = 'booting';

  const refill = (): void => {
    const scene = pickWeighted(scenes, recent, rng, AVOID_WINDOW);
    recent = pushRecent(recent, scene.id, AVOID_WINDOW);
    run += 1;
    label = scene.label;

    const steps = scene.build(rng).map((step) => ({
      delayMs: step.delayMs,
      ops: namespaceOps(step.ops, run),
      sceneId: scene.id,
    }));

    queue = [
      ...steps,
      {
        delayMs: 420,
        ops: [{ kind: 'append', line: { id: `r${run}:spacer`, chunks: [{ text: '', tone: 'dim' }] } }],
        sceneId: scene.id,
      },
    ];
    cursor = 0;
  };

  return {
    next(): EngineStep {
      if (cursor >= queue.length) refill();
      return queue[cursor++];
    },
    currentLabel: () => label,
  };
}
