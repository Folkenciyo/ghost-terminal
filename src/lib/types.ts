/** Colour roles the renderer maps to CSS custom properties. */
export type Tone =
  | 'default'
  | 'dim'
  | 'accent'
  | 'ok'
  | 'warn'
  | 'err'
  | 'info'
  | 'magenta'
  | 'cyan';

/** Smallest renderable unit: a run of text sharing one tone. */
export interface Chunk {
  readonly text: string;
  readonly tone: Tone;
  readonly bold?: true;
}

/** A terminal row. The id lets a later step rewrite the row in place. */
export interface Line {
  readonly id: string;
  readonly chunks: readonly Chunk[];
}

/** Buffer mutations, expressed as data so they stay testable. */
export type Op =
  | { readonly kind: 'append'; readonly line: Line }
  | { readonly kind: 'update'; readonly line: Line }
  | { readonly kind: 'clear' };

/** One tick of playback: wait `delayMs`, then apply `ops`. */
export interface Step {
  readonly delayMs: number;
  readonly ops: readonly Op[];
}

/** Seeded pseudo-random source. Deterministic per seed. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number, decimals?: number): number;
  pick<T>(items: readonly T[]): T;
  sample<T>(items: readonly T[], count: number): T[];
  chance(probability: number): boolean;
  hex(length: number): string;
}

/** A self-contained burst of fake activity. */
export interface Scene {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly hasProgress?: boolean;
  build(rng: Rng): readonly Step[];
}

/** A step tagged with the scene that produced it. */
export interface EngineStep extends Step {
  readonly sceneId: string;
}
