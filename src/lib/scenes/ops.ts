import { bar, chunk, pad, padLeft, percent } from '../ansi';
import {
  APT_PACKAGES, HOSTS, RESOURCES, SERVICES,
  duration, semver, sha, sizeKb,
} from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { FAIL, OK, createEmitter } from './helpers';

const terraformApply = (rng: Rng): readonly Step[] => {
  const e = createEmitter('tf');
  const add = rng.int(3, 9);

  e.command(rng, 'terraform apply -auto-approve');
  e.append(130, [
    chunk('Plan: ', 'dim'),
    chunk(`${add} to add`, 'ok'),
    chunk(`, ${rng.int(0, 4)} to change, ${rng.int(0, 2)} to destroy.`, 'dim'),
  ]);

  const rows = rng.sample(RESOURCES, Math.min(add, RESOURCES.length)).map((resource) => {
    const name = `${resource}.${rng.pick(['main', 'edge', 'primary', 'worker'])}`;
    const id = e.append(rng.int(60, 150), [
      chunk(pad(name, 40), 'cyan'),
      chunk('Creating...', 'warn'),
    ]);
    return { name, id };
  });

  rows.forEach((row) => {
    e.update(rng.int(140, 520), row.id, [
      chunk(pad(row.name, 40), 'cyan'),
      chunk(`${OK} Creation complete`, 'ok'),
      chunk(` after ${duration(rng)} [id=${sha(rng, 10)}]`, 'dim'),
    ]);
  });

  e.append(190, [
    chunk('Apply complete! ', 'ok', true),
    chunk(`Resources: ${rows.length} added, state ${sha(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const aptUpgrade = (rng: Rng): readonly Step[] => {
  const e = createEmitter('apt');
  const packages = rng.sample(APT_PACKAGES, rng.int(4, 8));

  e.command(rng, 'apt-get dist-upgrade -y');
  e.append(120, [
    chunk(`${packages.length} upgraded, 0 newly installed, `, 'dim'),
    chunk(`${sizeKb(rng)} of archives`, 'cyan'),
  ]);

  const id = e.append(90, [chunk('Fetching ', 'dim')]);
  packages.forEach((pkg, index) => {
    e.update(rng.int(60, 170), id, [
      chunk('Fetching ', 'dim'),
      chunk(bar((index + 1) / packages.length, 18), 'accent'),
      chunk(` ${padLeft(percent((index + 1) / packages.length), 4)}`, 'default'),
      chunk(`  ${pkg} ${semver(rng)}`, 'dim'),
    ]);
  });

  packages.forEach((pkg) => {
    e.append(rng.int(70, 190), [
      chunk('Unpacking ', 'dim'),
      chunk(pad(`${pkg}:amd64`, 26), 'default'),
      chunk(`(${semver(rng)}) over (${semver(rng)})`, 'dim'),
    ]);
  });

  e.append(190, [chunk(`${OK} Processing triggers for man-db, systemd`, 'ok')]);
  return e.steps();
};

const diskCheck = (rng: Rng): readonly Step[] => {
  const e = createEmitter('fsck');
  const device = `/dev/${rng.pick(['nvme0n1p2', 'sda1', 'vda3', 'mapper/root'])}`;
  const phases = [
    'Checking inodes, blocks, and sizes',
    'Checking directory structure',
    'Checking directory connectivity',
    'Checking reference counts',
    'Checking group summary information',
  ];

  e.command(rng, `fsck -fy ${device}`);

  phases.forEach((phase, index) => {
    const id = e.append(rng.int(60, 130), [
      chunk(`Pass ${index + 1}: `, 'dim'),
      chunk(pad(phase, 40), 'default'),
    ]);
    const ticks = rng.int(3, 6);
    for (let t = 1; t <= ticks; t++) {
      const ratio = t / ticks;
      e.update(rng.int(50, 160), id, [
        chunk(`Pass ${index + 1}: `, 'dim'),
        chunk(pad(phase, 40), 'default'),
        chunk(bar(ratio, 12), ratio >= 1 ? 'ok' : 'info'),
        chunk(` ${padLeft(percent(ratio), 4)}`, 'dim'),
      ]);
    }
  });

  e.append(190, [
    chunk(`${OK} ${device}: clean, `, 'ok', true),
    chunk(`${rng.int(90000, 4000000)}/${rng.int(4000000, 9000000)} files, ${sizeKb(rng)} free`, 'dim'),
  ]);
  return e.steps();
};

const canaryShift = (rng: Rng): readonly Step[] => {
  const e = createEmitter('canary');
  const service = rng.pick(SERVICES);
  const weights = [5, 10, 25, 50, 75, 100];

  e.command(rng, `argo rollouts promote ${service} --canary`);

  const id = e.append(110, [chunk('traffic  stable 100%  canary 0%', 'dim')]);
  weights.forEach((weight) => {
    e.update(rng.int(180, 520), id, [
      chunk('traffic  ', 'dim'),
      chunk(`stable ${padLeft(`${100 - weight}%`, 4)}  `, 'default'),
      chunk(`canary ${padLeft(`${weight}%`, 4)}  `, 'accent'),
      chunk(bar(weight / 100, 16), 'ok'),
    ]);
    e.append(rng.int(70, 200), [
      chunk('  analysis ', 'dim'),
      chunk(`err ${rng.float(0, 1.2, 2)}%  p95 ${duration(rng)}  `, 'default'),
      chunk(rng.chance(0.9) ? 'pass' : 'inconclusive', rng.chance(0.9) ? 'ok' : 'warn'),
    ]);
  });

  e.append(200, [chunk(`${OK} canary promoted to stable`, 'ok', true)]);
  return e.steps();
};

const chaosDrill = (rng: Rng): readonly Step[] => {
  const e = createEmitter('chaos');
  const target = rng.pick(SERVICES);

  e.command(rng, `chaosctl run --experiment ${rng.pick(['pod-kill', 'latency-inject', 'net-partition', 'cpu-hog'])} --target ${target}`);
  e.append(130, [chunk('  steady state hypothesis: ', 'dim'), chunk('availability > 99%', 'cyan')]);

  for (let i = 0; i < rng.int(3, 6); i++) {
    e.append(rng.int(120, 380), [
      chunk(`  ${FAIL} `, 'err'),
      chunk(pad(`killed pod ${target}-${sha(rng, 5)}`, 34), 'default'),
      chunk(`node ${rng.pick(HOSTS)}`, 'dim'),
    ]);
    e.append(rng.int(90, 260), [
      chunk(`  ${OK} `, 'ok'),
      chunk(pad('replacement scheduled', 34), 'dim'),
      chunk(`recovered in ${duration(rng)}`, 'ok'),
    ]);
  }

  e.append(200, [
    chunk(`${OK} hypothesis held `, 'ok', true),
    chunk(`availability ${rng.float(99, 99.999, 3)}%`, 'dim'),
  ]);
  return e.steps();
};

const gitBisect = (rng: Rng): readonly Step[] => {
  const e = createEmitter('bisect');
  let remaining = rng.int(180, 4000);

  e.command(rng, 'git bisect start HEAD v2.1.0');

  while (remaining > 1) {
    remaining = Math.floor(remaining / 2);
    const good = rng.chance(0.5);
    e.append(rng.int(90, 260), [
      chunk('Bisecting: ', 'dim'),
      chunk(padLeft(String(remaining), 5), 'accent'),
      chunk(' revisions left  ', 'dim'),
      chunk(sha(rng), 'magenta'),
      chunk(`  ${good ? 'good' : 'bad'}`, good ? 'ok' : 'err'),
    ]);
  }

  e.append(200, [
    chunk(`${OK} ${sha(rng)} is the first bad commit`, 'ok', true),
  ]);
  e.append(150, [chunk(`  ${rng.int(1, 40)} files changed, +${rng.int(3, 900)} -${rng.int(3, 400)}`, 'dim')]);
  return e.steps();
};

export const OPS_SCENES: readonly Scene[] = [
  { id: 'terraform-apply', label: 'provisioning infra', weight: 8, build: terraformApply },
  { id: 'apt-upgrade', label: 'upgrading packages', weight: 7, hasProgress: true, build: aptUpgrade },
  { id: 'disk-check', label: 'checking filesystem', weight: 6, hasProgress: true, build: diskCheck },
  { id: 'canary-shift', label: 'shifting canary traffic', weight: 8, hasProgress: true, build: canaryShift },
  { id: 'chaos-drill', label: 'running chaos drill', weight: 7, build: chaosDrill },
  { id: 'git-bisect', label: 'bisecting history', weight: 6, build: gitBisect },
];
