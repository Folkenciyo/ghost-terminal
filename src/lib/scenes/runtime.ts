import { bar, chunk, pad, padLeft, percent } from '../ansi';
import {
  HTTP_METHODS, HTTP_PATHS, SERVICES, TABLES,
  duration, ipv4, sha, stamp, uuid,
} from '../vocab';
import type { Rng, Scene, Step, Tone } from '../types';
import { OK, createEmitter } from './helpers';

const statusTone = (status: number): Tone =>
  status >= 500 ? 'err' : status >= 400 ? 'warn' : 'ok';

const httpLog = (rng: Rng): readonly Step[] => {
  const e = createEmitter('http');
  const service = rng.pick(SERVICES);

  e.command(rng, `kubectl logs -f deploy/${service} --tail=200`);

  for (let i = 0; i < rng.int(10, 22); i++) {
    const status = rng.chance(0.08)
      ? rng.pick([401, 404, 409, 429, 502, 503])
      : rng.pick([200, 200, 200, 201, 204, 304]);
    e.append(rng.int(45, 260), [
      chunk(stamp(rng) + ' ', 'dim'),
      chunk(pad(rng.pick(HTTP_METHODS), 7), 'cyan'),
      chunk(pad(rng.pick(HTTP_PATHS), 26), 'default'),
      chunk(padLeft(String(status), 4), statusTone(status), true),
      chunk(padLeft(duration(rng), 8), 'dim'),
      chunk(`  ${ipv4(rng)}`, 'dim'),
    ]);
  }

  e.append(200, [
    chunk('  rps ', 'dim'),
    chunk(String(rng.int(120, 8400)), 'accent', true),
    chunk(`  p99 ${duration(rng)}  err ${rng.float(0, 1.4, 2)}%`, 'dim'),
  ]);
  return e.steps();
};

const dbMigrate = (rng: Rng): readonly Step[] => {
  const e = createEmitter('db');
  const engine = rng.pick(['drizzle-kit', 'alembic', 'sqlx', 'prisma']);

  e.command(rng, `${engine} migrate --env production`);
  e.append(130, [chunk(`connected to postgres://db-primary:5432/${rng.pick(['core', 'ledger', 'atlas'])}`, 'dim')]);

  rng.sample(TABLES, rng.int(3, 6)).forEach((table, index) => {
    const migration = `${String(rng.int(1, 99)).padStart(4, '0')}_alter_${table}.sql`;
    e.append(rng.int(90, 220), [
      chunk('  applying ', 'dim'),
      chunk(pad(migration, 30), 'info'),
      chunk(`#${index + 1}`, 'dim'),
    ]);
    e.append(rng.int(70, 190), [
      chunk('    ', 'dim'),
      chunk(rng.pick(['ALTER TABLE', 'CREATE INDEX', 'ADD CONSTRAINT', 'BACKFILL']), 'magenta'),
      chunk(` ${table} `, 'default'),
      chunk(`(${rng.int(1200, 980000)} rows, ${duration(rng)})`, 'dim'),
    ]);
  });

  e.append(150, [chunk('  vacuum analyze ', 'dim'), chunk('complete', 'ok')]);
  e.append(160, [chunk(`${OK} schema at revision ${sha(rng)}`, 'ok', true)]);
  return e.steps();
};

const trainModel = (rng: Rng): readonly Step[] => {
  const e = createEmitter('ml');
  const epochs = rng.int(4, 9);
  const model = rng.pick(['ranker-v3', 'embed-small', 'router-moe', 'vision-tiny', 'asr-stream']);

  e.command(rng, `python train.py --model ${model} --epochs ${epochs}`);
  e.append(130, [
    chunk(`device cuda:0 `, 'dim'),
    chunk(`${rng.int(4, 80)}GB`, 'cyan'),
    chunk(`  params ${rng.float(0.1, 70, 1)}B  run ${uuid(rng).slice(0, 8)}`, 'dim'),
  ]);

  let loss = rng.float(2.1, 4.8, 4);
  for (let epoch = 1; epoch <= epochs; epoch++) {
    const id = e.append(80, [chunk(`epoch ${epoch}/${epochs}`, 'dim')]);
    const ticks = rng.int(4, 8);
    for (let i = 1; i <= ticks; i++) {
      const ratio = i / ticks;
      loss = Number(Math.max(0.0021, loss * rng.float(0.86, 0.99, 3)).toFixed(4));
      e.update(rng.int(70, 220), id, [
        chunk(`epoch ${padLeft(String(epoch), 2)}/${epochs} `, 'default'),
        chunk(bar(ratio, 18), 'magenta'),
        chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
        chunk(`  loss ${loss.toFixed(4)}  acc ${rng.float(0.42, 0.998, 4)}`, 'dim'),
      ]);
    }
  }

  e.append(200, [
    chunk(`${OK} checkpoint saved `, 'ok'),
    chunk(`s3://models/${model}/${sha(rng, 8)}.safetensors`, 'dim'),
  ]);
  return e.steps();
};

export const RUNTIME_SCENES: readonly Scene[] = [
  { id: 'http-log', label: 'streaming request log', weight: 11, build: httpLog },
  { id: 'db-migrate', label: 'applying migrations', weight: 8, build: dbMigrate },
  { id: 'train-model', label: 'training model', weight: 9, hasProgress: true, build: trainModel },
];
