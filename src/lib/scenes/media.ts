import { bar, chunk, pad, padLeft, percent } from '../ansi';
import { CODECS, MODULES, duration, semver, sha, sizeKb } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const encodeVideo = (rng: Rng): readonly Step[] => {
  const e = createEmitter('ffmpeg');
  const codec = rng.pick(CODECS);
  const totalFrames = rng.int(2400, 48000);

  e.command(rng, `ffmpeg -i master.mov -c:v ${codec} -crf ${rng.int(16, 28)} out.mp4`);
  e.append(120, [
    chunk(`Stream #0:0 `, 'dim'),
    chunk(`${rng.pick(['3840x2160', '1920x1080', '2560x1440'])} ${rng.int(24, 60)}fps`, 'cyan'),
    chunk(`  ${codec}  ${sizeKb(rng)}`, 'dim'),
  ]);

  const id = e.append(90, [chunk('frame=      0', 'dim')]);
  const ticks = rng.int(12, 22);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(60, 160), id, [
      chunk(`frame=${padLeft(String(Math.round(totalFrames * ratio)), 7)} `, 'default'),
      chunk(bar(ratio, 16), 'magenta'),
      chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
      chunk(`  fps=${rng.int(18, 420)} q=${rng.float(18, 34, 1)} speed=${rng.float(0.4, 9, 2)}x`, 'dim'),
    ]);
  }

  e.append(180, [
    chunk(`${OK} muxing overhead `, 'ok'),
    chunk(`${rng.float(0.1, 4, 3)}%  ${sizeKb(rng)} written in ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const renderFrame = (rng: Rng): readonly Step[] => {
  const e = createEmitter('render');
  const samples = rng.int(128, 4096);
  const buckets = rng.int(4, 7);

  e.command(rng, `blender -b scene.blend -F PNG -f ${rng.int(1, 900)}`);
  e.append(120, [
    chunk('Cycles ', 'dim'),
    chunk(`${samples} samples`, 'cyan'),
    chunk(`  denoiser optix  tiles ${buckets * buckets}`, 'dim'),
  ]);

  const ids = Array.from({ length: buckets }, (_, index) =>
    e.append(rng.int(40, 90), [
      chunk(`tile ${index + 1} `, 'dim'),
      chunk(bar(0, 14), 'dim'),
      chunk('   queued', 'dim'),
    ]),
  );

  const ticks = rng.int(6, 11);
  for (let i = 1; i <= ticks; i++) {
    ids.forEach((id, index) => {
      const ratio = Math.min(1, (i / ticks) * rng.float(0.7, 1.4, 2));
      e.update(rng.int(45, 130), id, [
        chunk(`tile ${index + 1} `, 'dim'),
        chunk(bar(ratio, 14), ratio >= 1 ? 'ok' : 'warn'),
        chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
        chunk(`  ${Math.round(samples * ratio)}/${samples} spp`, 'dim'),
      ]);
    });
  }

  e.append(190, [
    chunk(`${OK} saved `, 'ok'),
    chunk(`//render/frame_${sha(rng, 6)}.png in ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const compileShaders = (rng: Rng): readonly Step[] => {
  const e = createEmitter('shader');
  const stages = ['vertex', 'fragment', 'compute', 'geometry', 'mesh'];

  e.command(rng, `naga-cli --validate shaders/ --target spirv`);

  rng.sample(stages, rng.int(3, 5)).forEach((stage) => {
    const warn = rng.chance(0.3);
    e.append(rng.int(70, 190), [
      chunk(`  ${warn ? '!' : OK} `, warn ? 'warn' : 'ok'),
      chunk(pad(`${rng.pick(MODULES)}.${stage}.wgsl`, 30), 'default'),
      chunk(
        warn ? `implicit cast at line ${rng.int(4, 220)}` : `spirv ${semver(rng)}  ${rng.int(12, 900)} ops`,
        'dim',
      ),
    ]);
  });

  const id = e.append(100, [chunk('  linking pipelines ', 'dim')]);
  for (let i = 1; i <= 8; i++) {
    e.update(rng.int(60, 150), id, [
      chunk('  linking pipelines ', 'dim'),
      chunk(bar(i / 8, 16), 'cyan'),
      chunk(` ${i * rng.int(2, 9)} variants`, 'dim'),
    ]);
  }
  e.append(180, [chunk(`  ${OK} pipeline cache warm`, 'ok', true)]);
  return e.steps();
};

export const MEDIA_SCENES: readonly Scene[] = [
  { id: 'encode-video', label: 'encoding video', weight: 8, hasProgress: true, build: encodeVideo },
  { id: 'render-frame', label: 'rendering frame', weight: 7, hasProgress: true, build: renderFrame },
  { id: 'compile-shaders', label: 'compiling shaders', weight: 6, hasProgress: true, build: compileShaders },
];
