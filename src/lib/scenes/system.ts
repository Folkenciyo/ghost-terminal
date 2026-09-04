import { bar, chunk, pad, padLeft } from '../ansi';
import { HOSTS, MODULES, SERVICES, ipv4, port, semver, sha, uuid } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const PRINTABLE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_/@';

const sysmon = (rng: Rng): readonly Step[] => {
  const e = createEmitter('top');
  const procs = rng.sample(SERVICES, rng.int(5, 8));

  e.command(rng, rng.pick(['htop -d 5', 'btop --preset 2', 'top -o cpu']));
  e.append(110, [
    chunk('  PID   USER      CPU%   MEM%   TIME     COMMAND', 'dim', true),
  ]);

  const rows = procs.map((name) => {
    const pid = rng.int(1000, 65000);
    const id = e.append(rng.int(40, 90), [
      chunk(padLeft(String(pid), 6), 'dim'),
      chunk('  ' + pad(rng.pick(['root', 'app', 'runner', 'nobody']), 9), 'dim'),
      chunk(padLeft('0.0', 6), 'default'),
      chunk(padLeft('0.0', 7), 'default'),
      chunk('   00:00   ', 'dim'),
      chunk(name, 'cyan'),
    ]);
    return { name, pid, id };
  });

  for (let frame = 0; frame < rng.int(6, 12); frame++) {
    rows.forEach((row) => {
      const cpu = rng.float(0.1, 98, 1);
      e.update(rng.int(40, 120), row.id, [
        chunk(padLeft(String(row.pid), 6), 'dim'),
        chunk('  ' + pad(rng.pick(['root', 'app', 'runner', 'nobody']), 9), 'dim'),
        chunk(padLeft(cpu.toFixed(1), 6), cpu > 70 ? 'err' : cpu > 35 ? 'warn' : 'ok'),
        chunk(padLeft(rng.float(0.4, 62, 1).toFixed(1), 7), 'default'),
        chunk(`   ${padLeft(String(rng.int(0, 59)), 2)}:${String(rng.int(0, 59)).padStart(2, '0')}   `, 'dim'),
        chunk(row.name, 'cyan'),
      ]);
    });
  }

  e.append(180, [
    chunk('load average: ', 'dim'),
    chunk(`${rng.float(0.2, 12, 2)} ${rng.float(0.2, 12, 2)} ${rng.float(0.2, 12, 2)}`, 'accent'),
    chunk(`  tasks ${rng.int(120, 900)}`, 'dim'),
  ]);
  return e.steps();
};

const hexDump = (rng: Rng): readonly Step[] => {
  const e = createEmitter('hex');
  const base = rng.int(0, 0xfff) * 16;

  e.command(rng, `xxd -s ${base} -l 512 /proc/${rng.int(100, 9000)}/mem`);

  for (let i = 0; i < rng.int(8, 16); i++) {
    const bytes = Array.from({ length: 16 }, () => rng.hex(2));
    const ascii = bytes
      .map(() => (rng.chance(0.55) ? rng.pick([...PRINTABLE]) : '.'))
      .join('');
    e.append(rng.int(40, 110), [
      chunk((base + i * 16).toString(16).padStart(8, '0'), 'magenta'),
      chunk('  ' + bytes.slice(0, 8).join(' '), 'dim'),
      chunk('  ' + bytes.slice(8).join(' '), 'dim'),
      chunk(`  |${ascii}|`, 'cyan'),
    ]);
  }

  e.append(190, [
    chunk(`${OK} region mapped `, 'ok'),
    chunk(`rw-p ${sha(rng, 12)} ${rng.int(4, 512)}kB`, 'dim'),
  ]);
  return e.steps();
};

const BANNERS: readonly (readonly string[])[] = [
  [
    '╔══════════════════════════════════════════╗',
    '║   G H O S T   R U N T I M E   ·  v4.2    ║',
    '╚══════════════════════════════════════════╝',
  ],
  [
    '┌─────────────────────────────────────────┐',
    '│  ▄▄▄  ORBITAL BUILD MESH  ▄▄▄           │',
    '└─────────────────────────────────────────┘',
  ],
  [
    '·▄▄▄▄  ▄▄▄· ▄▄▄ .·▄▄▄• ▄▄▄  ▄· ▄▌',
    '██▪ ██ ▐█ ▀█ ▀▄.▀·▐▄▄·▀▄ █·▐█▪██▌',
    '▐█· ▐█▌▄█▀▀█ ▐▀▀▪▄██▪ ▐▀▀▄ ▐█▌▐█▪',
  ],
];

const bootBanner = (rng: Rng): readonly Step[] => {
  const e = createEmitter('boot');
  const art = rng.pick(BANNERS);

  art.forEach((row) => e.append(rng.int(60, 130), [chunk(row, 'accent', true)]));

  e.append(140, [
    chunk('  node ', 'dim'),
    chunk(pad(rng.pick(HOSTS), 14), 'cyan'),
    chunk(`kernel ${semver(rng)}  region ${rng.pick(['fra1', 'iad2', 'sfo3', 'lhr1'])}`, 'dim'),
  ]);
  e.append(120, [
    chunk('  session ', 'dim'),
    chunk(uuid(rng), 'info'),
  ]);

  rng.sample(MODULES, rng.int(4, 7)).forEach((mod) => {
    const ready = rng.chance(0.85);
    e.append(rng.int(70, 190), [
      chunk(`  [ ${ready ? OK : '~'} ] `, ready ? 'ok' : 'warn'),
      chunk(pad(mod, 14), 'default'),
      chunk(ready ? `bound ${ipv4(rng)}:${port(rng)}` : 'degraded, retrying', ready ? 'dim' : 'warn'),
    ]);
  });

  const readyId = e.append(90, [chunk('  warming caches ', 'dim')]);
  for (let i = 1; i <= 6; i++) {
    e.update(rng.int(70, 160), readyId, [
      chunk('  warming caches ', 'dim'),
      chunk(bar(i / 6, 20), 'ok'),
      chunk(` ${rng.int(1, 64)} shards`, 'dim'),
    ]);
  }
  e.append(200, [chunk('  system ready', 'ok', true)]);
  return e.steps();
};

export const SYSTEM_SCENES: readonly Scene[] = [
  { id: 'sysmon', label: 'sampling processes', weight: 9, build: sysmon },
  { id: 'hex-dump', label: 'dumping memory region', weight: 6, build: hexDump },
  { id: 'boot-banner', label: 'bringing node online', weight: 5, build: bootBanner },
];
