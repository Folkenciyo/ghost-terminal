import { bar, chunk, pad, padLeft, percent } from '../ansi';
import { MODULES, PACKAGES, filePath, semver, sha, sizeKb } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const npmInstall = (rng: Rng): readonly Step[] => {
  const e = createEmitter('npm');
  const manager = rng.pick(['pnpm', 'npm', 'bun', 'yarn']);
  const total = rng.int(180, 1400);

  e.command(rng, `${manager} install --frozen-lockfile`);
  e.append(140, [chunk('Lockfile is up to date, resolving graph...', 'dim')]);
  e.append(120, [
    chunk('Packages: ', 'dim'),
    chunk(`+${total}`, 'ok'),
    chunk(`  reused ${rng.int(20, total - 20)}`, 'dim'),
  ]);

  const progressId = e.append(90, [chunk('Progress: 0%', 'dim')]);
  const ticks = rng.int(8, 16);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(70, 190), progressId, [
      chunk(bar(ratio, 22), 'accent'),
      chunk(` ${padLeft(percent(ratio), 4)} `, 'default'),
      chunk(`${rng.pick(PACKAGES)}@${semver(rng)}`, 'dim'),
    ]);
  }

  rng.sample(PACKAGES, rng.int(3, 6)).forEach((pkg) => {
    e.append(rng.int(50, 130), [
      chunk(` + `, 'ok'),
      chunk(pad(`${pkg}@${semver(rng)}`, 30), 'default'),
      chunk(sizeKb(rng), 'dim'),
    ]);
  });

  e.append(160, [
    chunk(`${OK} done`, 'ok', true),
    chunk(` in ${rng.float(1.2, 28, 1)}s`, 'dim'),
  ]);
  return e.steps();
};

const bundler = (rng: Rng): readonly Step[] => {
  const e = createEmitter('bundle');
  const tool = rng.pick(['vite', 'turbopack', 'rspack', 'esbuild']);
  const modules = rng.int(420, 4800);

  e.command(rng, `${tool} build --mode production`);
  e.append(120, [chunk(`${tool} v${semver(rng)} building for production...`, 'dim')]);

  const transformId = e.append(90, [chunk('transforming...', 'dim')]);
  const ticks = rng.int(10, 18);
  for (let i = 1; i <= ticks; i++) {
    e.update(rng.int(60, 150), transformId, [
      chunk('transforming ', 'dim'),
      chunk(`(${Math.round((modules * i) / ticks)})`, 'cyan'),
      chunk(` ${filePath(rng)}`, 'dim'),
    ]);
  }

  e.append(140, [chunk(`${OK} ${modules} modules transformed.`, 'ok')]);
  e.append(90, [chunk('rendering chunks...', 'dim')]);

  rng.sample(MODULES, rng.int(3, 5)).forEach((mod) => {
    e.append(rng.int(60, 140), [
      chunk(`dist/assets/${mod}-${sha(rng, 8)}.js`, 'info'),
      chunk(padLeft(sizeKb(rng), 12), 'default'),
      chunk(` │ gzip: ${sizeKb(rng)}`, 'dim'),
    ]);
  });

  e.append(180, [chunk(`${OK} built in ${rng.float(0.9, 42, 2)}s`, 'ok', true)]);
  return e.steps();
};

const cargoBuild = (rng: Rng): readonly Step[] => {
  const e = createEmitter('cargo');
  const crates = rng.int(80, 420);
  const profile = rng.pick(['release', 'dev', 'bench']);

  e.command(rng, `cargo build --${profile === 'dev' ? 'workspace' : profile}`);
  e.append(120, [chunk('    Updating', 'ok'), chunk(' crates.io index', 'dim')]);

  const barId = e.append(90, [chunk('    Building [', 'dim')]);
  const ticks = rng.int(10, 20);
  for (let i = 1; i <= ticks; i++) {
    const done = Math.round((crates * i) / ticks);
    e.update(rng.int(80, 200), barId, [
      chunk('    Building ', 'ok'),
      chunk(bar(i / ticks, 18), 'accent'),
      chunk(` ${done}/${crates}`, 'default'),
      chunk(`: ${rng.pick(MODULES)}`, 'dim'),
    ]);
  }

  rng.sample(MODULES, rng.int(2, 4)).forEach((mod) => {
    e.append(rng.int(70, 180), [
      chunk('   Compiling ', 'ok'),
      chunk(`${mod} v${semver(rng)}`, 'default'),
    ]);
  });

  e.append(200, [
    chunk(`  ${OK} Finished `, 'ok', true),
    chunk(`${profile} [optimized] target(s) in ${rng.float(2, 96, 2)}s`, 'dim'),
  ]);
  return e.steps();
};

export const BUILD_SCENES: readonly Scene[] = [
  { id: 'npm-install', label: 'installing dependencies', weight: 10, hasProgress: true, build: npmInstall },
  { id: 'bundler', label: 'bundling assets', weight: 10, hasProgress: true, build: bundler },
  { id: 'cargo-build', label: 'compiling crates', weight: 8, hasProgress: true, build: cargoBuild },
];
