import { bar, chunk, pad, padLeft, percent } from '../ansi';
import { BRANCHES, HOSTS, SERVICES, duration, semver, sha, sizeKb } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const dockerBuild = (rng: Rng): readonly Step[] => {
  const e = createEmitter('docker');
  const service = rng.pick(SERVICES);

  e.command(rng, `docker buildx build -t ${service}:${semver(rng)} --push .`);

  const layers = rng.sample(
    ['base', 'deps', 'builder', 'runtime', 'assets', 'certs', 'entrypoint'],
    rng.int(3, 5),
  );
  const ids = layers.map((name, index) =>
    e.append(rng.int(60, 140), [
      chunk(`#${index + 2} `, 'dim'),
      chunk(pad(`[${name}]`, 12), 'cyan'),
      chunk('waiting', 'dim'),
    ]),
  );

  const ticks = rng.int(7, 13);
  for (let i = 1; i <= ticks; i++) {
    ids.forEach((id, index) => {
      const ratio = Math.min(1, (i / ticks) * rng.float(0.75, 1.35, 2));
      e.update(rng.int(40, 110), id, [
        chunk(`#${index + 2} `, 'dim'),
        chunk(pad(`[${layers[index]}]`, 12), 'cyan'),
        chunk(bar(ratio, 16), 'accent'),
        chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
        chunk(`  ${sizeKb(rng)}`, 'dim'),
      ]);
    });
  }

  e.append(160, [chunk('#' + rng.int(14, 30) + ' exporting layers ', 'dim'), chunk('100%', 'ok', true)]);
  e.append(180, [
    chunk(`${OK} pushed `, 'ok'),
    chunk(`sha256:${sha(rng, 12)}`, 'dim'),
    chunk(` in ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const rollout = (rng: Rng): readonly Step[] => {
  const e = createEmitter('k8s');
  const service = rng.pick(SERVICES);
  const replicas = rng.int(3, 9);

  e.command(rng, `kubectl rollout status deploy/${service} -n prod`);

  const statusId = e.append(120, [chunk(`Waiting for rollout to finish...`, 'dim')]);
  for (let updated = 1; updated <= replicas; updated++) {
    e.update(rng.int(120, 320), statusId, [
      chunk('Waiting for rollout: ', 'dim'),
      chunk(`${updated}/${replicas}`, 'accent', true),
      chunk(' replicas updated', 'dim'),
    ]);
    e.append(rng.int(70, 180), [
      chunk('  pod/', 'dim'),
      chunk(pad(`${service}-${sha(rng, 5)}-${sha(rng, 4)}`, 34), 'default'),
      chunk(rng.chance(0.15) ? 'ContainerCreating' : 'Running', rng.chance(0.15) ? 'warn' : 'ok'),
      chunk(`  ${rng.pick(HOSTS)}`, 'dim'),
    ]);
  }

  e.append(200, [
    chunk(`deployment "${service}" `, 'default'),
    chunk('successfully rolled out', 'ok', true),
  ]);
  return e.steps();
};

const gitOps = (rng: Rng): readonly Step[] => {
  const e = createEmitter('git');
  const branch = rng.pick(BRANCHES);
  const objects = rng.int(60, 980);

  e.command(rng, `git push origin ${branch}`);
  e.append(120, [chunk(`Enumerating objects: ${objects}, done.`, 'dim')]);

  const countId = e.append(90, [chunk('Counting objects: 0%', 'dim')]);
  const ticks = rng.int(6, 11);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(50, 130), countId, [
      chunk('Counting objects: ', 'dim'),
      chunk(padLeft(percent(ratio), 4), 'ok'),
      chunk(` (${Math.round(objects * ratio)}/${objects})`, 'dim'),
    ]);
  }

  const writeId = e.append(90, [chunk('Writing objects: 0%', 'dim')]);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(60, 150), writeId, [
      chunk('Writing objects: ', 'dim'),
      chunk(bar(ratio, 14), 'accent'),
      chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
      chunk(`  ${sizeKb(rng)} | ${sizeKb(rng)}/s`, 'dim'),
    ]);
  }

  e.append(150, [chunk('remote: Resolving deltas: ', 'dim'), chunk('100%', 'ok')]);
  e.append(170, [
    chunk(`   ${sha(rng)}..${sha(rng)}  `, 'magenta'),
    chunk(`${branch} -> ${branch}`, 'default'),
  ]);
  return e.steps();
};

export const INFRA_SCENES: readonly Scene[] = [
  { id: 'docker-build', label: 'building image', weight: 10, hasProgress: true, build: dockerBuild },
  { id: 'k8s-rollout', label: 'rolling out release', weight: 9, build: rollout },
  { id: 'git-push', label: 'pushing objects', weight: 8, hasProgress: true, build: gitOps },
];
