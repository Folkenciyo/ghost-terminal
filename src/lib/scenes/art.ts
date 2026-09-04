import { bar, chunk, pad, padLeft } from '../ansi';
import { GLYPHS, HOSTS, MODULES, SERVICES, duration, semver, sizeKb } from '../vocab';
import type { Rng, Scene, Step, Tone } from '../types';
import { OK, createEmitter } from './helpers';

const GLYPH_LIST = [...GLYPHS];
const RAIN_WIDTH = 64;
const HEAT_COLS = 40;

const glyphRow = (rng: Rng, density: number): string =>
  Array.from({ length: RAIN_WIDTH }, () => (rng.chance(density) ? rng.pick(GLYPH_LIST) : ' ')).join('');

const matrixRain = (rng: Rng): readonly Step[] => {
  const e = createEmitter('rain');
  const rows = rng.int(8, 14);

  e.command(rng, `decoder --stream ${rng.pick(SERVICES)} --raw`);

  const ids = Array.from({ length: rows }, (_, index) =>
    e.append(rng.int(30, 70), [chunk(glyphRow(rng, 0.1 + index / (rows * 4)), 'dim')]),
  );

  const frames = rng.int(10, 18);
  for (let frame = 0; frame < frames; frame++) {
    ids.forEach((id, index) => {
      const lead = (frame + index) % rows === 0;
      e.update(rng.int(35, 90), id, [
        chunk(glyphRow(rng, 0.25 + (index / rows) * 0.5), lead ? 'ok' : 'dim'),
      ]);
    });
  }

  e.append(200, [
    chunk(`${OK} stream decoded `, 'ok', true),
    chunk(`${sizeKb(rng)} in ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const CELL_TONES: readonly Tone[] = ['dim', 'info', 'cyan', 'ok', 'warn', 'err'];

const heatGrid = (rng: Rng): readonly Step[] => {
  const e = createEmitter('heat');
  const rows = rng.int(6, 10);

  e.command(rng, `clusterctl heatmap --namespace prod --interval 1s`);
  e.append(110, [chunk(`  ${rows} racks × ${HEAT_COLS} slots  ·  utilisation`, 'dim')]);

  const ids = Array.from({ length: rows }, (_, index) =>
    e.append(rng.int(35, 80), [
      chunk(pad(`rack-${String(index + 1).padStart(2, '0')}`, 9), 'dim'),
      chunk('░'.repeat(HEAT_COLS), 'dim'),
    ]),
  );

  const frames = rng.int(8, 16);
  for (let frame = 0; frame < frames; frame++) {
    ids.forEach((id, index) => {
      const load = rng.float(0.05, 1, 2);
      const filled = Math.round(load * HEAT_COLS);
      e.update(rng.int(40, 110), id, [
        chunk(pad(`rack-${String(index + 1).padStart(2, '0')}`, 9), 'dim'),
        chunk('▓'.repeat(filled), CELL_TONES[Math.min(CELL_TONES.length - 1, Math.floor(load * 6))]),
        chunk('░'.repeat(HEAT_COLS - filled), 'dim'),
        chunk(`  ${padLeft(`${Math.round(load * 100)}%`, 4)}`, 'default'),
      ]);
    });
  }

  e.append(200, [chunk(`${OK} scheduler settled, 0 pending pods`, 'ok', true)]);
  return e.steps();
};

const MESH = [
  '        ┌──────────┐        ┌──────────┐',
  '        │  edge-a  │◀──────▶│  edge-b  │',
  '        └────┬─────┘        └─────┬────┘',
  '             │    ╲          ╱    │',
  '             ▼     ╲        ╱     ▼',
  '        ┌──────────┐╲      ╱┌──────────┐',
  '        │  core-1  │─╳────╳─│  core-2  │',
  '        └────┬─────┘        └─────┬────┘',
  '             └────────┬───────────┘',
  '                 ┌────▼─────┐',
  '                 │  ledger  │',
  '                 └──────────┘',
];

const meshTopology = (rng: Rng): readonly Step[] => {
  const e = createEmitter('mesh');

  e.command(rng, 'meshctl topology --live');
  MESH.forEach((row) => e.append(rng.int(40, 95), [chunk(row, 'cyan')]));

  const links = rng.sample([...MODULES], rng.int(3, 6));
  const ids = links.map((name) =>
    e.append(rng.int(60, 140), [
      chunk(`  ${pad(name, 14)}`, 'dim'),
      chunk('probing...', 'warn'),
    ]),
  );

  ids.forEach((id, index) => {
    e.update(rng.int(120, 340), id, [
      chunk(`  ${pad(links[index], 14)}`, 'dim'),
      chunk(`${OK} ${rng.pick(HOSTS)}`, 'ok'),
      chunk(`  rtt ${duration(rng)}  loss ${rng.float(0, 0.9, 2)}%`, 'dim'),
    ]);
  });

  e.append(200, [chunk(`${OK} mesh converged, all routes healthy`, 'ok', true)]);
  return e.steps();
};

const benchmark = (rng: Rng): readonly Step[] => {
  const e = createEmitter('bench');
  const candidates = rng.sample([...MODULES], rng.int(3, 5));

  e.command(rng, `hyperfine --warmup 3 ${candidates.map((c) => `'${c} --bench'`).join(' ')}`);

  const rows = candidates.map((name) => {
    const id = e.append(rng.int(50, 120), [
      chunk(pad(name, 14), 'default'),
      chunk(bar(0, 22), 'dim'),
      chunk('  warming up', 'dim'),
    ]);
    return { name, id, score: rng.float(0.2, 1, 3) };
  });

  const ticks = rng.int(5, 9);
  for (let t = 1; t <= ticks; t++) {
    rows.forEach((row) => {
      const ratio = Math.min(1, (t / ticks) * row.score * 1.35);
      e.update(rng.int(50, 150), row.id, [
        chunk(pad(row.name, 14), 'default'),
        chunk(bar(ratio, 22), ratio > 0.8 ? 'ok' : ratio > 0.45 ? 'warn' : 'err'),
        chunk(`  ${rng.float(0.4, 900, 1)}ms ± ${rng.float(0.1, 40, 1)}`, 'dim'),
      ]);
    });
  }

  const winner = rows[0].name;
  e.append(190, [
    chunk(`${OK} '${winner}' ran `, 'ok', true),
    chunk(`${rng.float(1.05, 8.4, 2)}× faster than the slowest  (v${semver(rng)})`, 'dim'),
  ]);
  return e.steps();
};

export const ART_SCENES: readonly Scene[] = [
  { id: 'matrix-rain', label: 'decoding raw stream', weight: 5, build: matrixRain },
  { id: 'heat-grid', label: 'mapping cluster load', weight: 7, build: heatGrid },
  { id: 'mesh-topology', label: 'converging mesh', weight: 6, build: meshTopology },
  { id: 'benchmark', label: 'benchmarking candidates', weight: 7, hasProgress: true, build: benchmark },
];
