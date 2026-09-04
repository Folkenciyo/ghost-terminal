import { bar, chunk, pad, padLeft, percent } from '../ansi';
import {
  REDIS_COMMANDS, REGIONS, TABLES, TOPICS,
  duration, filePath, ipv4, semver, sizeKb, stamp, uuid,
} from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const kafkaLag = (rng: Rng): readonly Step[] => {
  const e = createEmitter('kafka');
  const group = `${rng.pick(['billing', 'search', 'mailer', 'ledger'])}-consumer`;

  e.command(rng, `kafka-consumer-groups --describe --group ${group}`);
  e.append(120, [chunk('TOPIC              PART  CURRENT-OFFSET  LOG-END  LAG', 'dim', true)]);

  const rows = rng.sample(TOPICS, rng.int(4, 7)).map((topic) => {
    const partition = rng.int(0, 11);
    const id = e.append(rng.int(50, 120), [
      chunk(pad(topic, 19), 'cyan'),
      chunk(padLeft(String(partition), 4), 'dim'),
      chunk(padLeft('—', 16), 'dim'),
      chunk(padLeft('—', 9), 'dim'),
      chunk(padLeft('—', 6), 'dim'),
    ]);
    return { topic, partition, id, offset: rng.int(10_000, 9_000_000) };
  });

  for (let frame = 0; frame < rng.int(5, 10); frame++) {
    rows.forEach((row) => {
      const lag = rng.chance(0.2) ? rng.int(4000, 90_000) : rng.int(0, 900);
      const end = row.offset + lag;
      e.update(rng.int(60, 190), row.id, [
        chunk(pad(row.topic, 19), 'cyan'),
        chunk(padLeft(String(row.partition), 4), 'dim'),
        chunk(padLeft(String(row.offset), 16), 'default'),
        chunk(padLeft(String(end), 9), 'default'),
        chunk(padLeft(String(lag), 6), lag > 3000 ? 'err' : lag > 500 ? 'warn' : 'ok'),
      ]);
    });
  }

  e.append(190, [
    chunk(`${OK} rebalance settled `, 'ok'),
    chunk(`${rows.length} partitions assigned in ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const redisMonitor = (rng: Rng): readonly Step[] => {
  const e = createEmitter('redis');

  e.command(rng, `redis-cli -h cache-01 monitor`);
  e.append(110, [chunk('OK', 'ok')]);

  for (let i = 0; i < rng.int(12, 26); i++) {
    const command = rng.pick(REDIS_COMMANDS);
    e.append(rng.int(35, 170), [
      chunk(stamp(rng) + ' ', 'dim'),
      chunk(`[0 ${ipv4(rng)}:${rng.int(30000, 60000)}] `, 'dim'),
      chunk(pad(command, 9), 'magenta'),
      chunk(`"${rng.pick(['sess', 'user', 'cart', 'rate', 'feed'])}:${rng.hex(8)}"`, 'default'),
      chunk(command === 'SETEX' ? `  ttl ${rng.int(30, 86400)}` : '', 'dim'),
    ]);
  }

  e.append(190, [
    chunk(`${OK} ops/sec `, 'ok'),
    chunk(`${rng.int(2000, 190000)}  hit rate ${rng.float(70, 99.9, 1)}%  mem ${sizeKb(rng)}`, 'dim'),
  ]);
  return e.steps();
};

const syncObjects = (rng: Rng): readonly Step[] => {
  const e = createEmitter('s3');
  const bucket = `acme-${rng.pick(['media', 'backups', 'exports', 'artifacts'])}`;
  const region = rng.pick(REGIONS);

  e.command(rng, `aws s3 sync ./dist s3://${bucket} --region ${region} --delete`);

  const files = rng.int(4, 8);
  for (let i = 0; i < files; i++) {
    const id = e.append(rng.int(50, 130), [
      chunk('upload: ', 'dim'),
      chunk(pad(filePath(rng), 34), 'default'),
      chunk(bar(0, 12), 'dim'),
    ]);
    const ticks = rng.int(3, 6);
    for (let t = 1; t <= ticks; t++) {
      const ratio = t / ticks;
      e.update(rng.int(45, 140), id, [
        chunk('upload: ', 'dim'),
        chunk(pad(filePath(rng), 34), 'default'),
        chunk(bar(ratio, 12), 'accent'),
        chunk(` ${padLeft(percent(ratio), 4)} ${sizeKb(rng)}`, 'dim'),
      ]);
    }
  }

  e.append(190, [
    chunk(`${OK} ${files} objects synced `, 'ok', true),
    chunk(`${sizeKb(rng)} transferred, ${rng.int(0, 9)} deleted`, 'dim'),
  ]);
  return e.steps();
};

const queryPlan = (rng: Rng): readonly Step[] => {
  const e = createEmitter('explain');
  const table = rng.pick(TABLES);
  const joined = rng.pick(TABLES);

  e.command(rng, `psql -c "EXPLAIN ANALYZE SELECT * FROM ${table} JOIN ${joined} USING (id)"`);

  const nodes = [
    ['Gather Merge', 'workers 4'],
    ['  Sort', `key ${table}.created_at`],
    ['    Hash Join', `hash cond ${joined}.id`],
    ['      Parallel Seq Scan', `on ${table}`],
    ['      Hash', `buckets ${rng.int(1024, 65536)}`],
    ['        Index Scan', `using idx_${joined}_id`],
  ];
  nodes.forEach(([node, detail]) => {
    e.append(rng.int(70, 200), [
      chunk(pad(node, 26), 'magenta'),
      chunk(pad(detail, 26), 'dim'),
      chunk(`rows=${rng.int(1, 900000)} `, 'default'),
      chunk(`actual ${duration(rng)}`, 'cyan'),
    ]);
  });

  e.append(150, [chunk('  Buffers: ', 'dim'), chunk(`shared hit=${rng.int(100, 90000)} read=${rng.int(0, 4000)}`, 'default')]);
  e.append(190, [
    chunk(`${OK} planning ${duration(rng)}  execution ${duration(rng)}`, 'ok'),
    chunk(`  pg ${semver(rng)}  txn ${uuid(rng).slice(0, 8)}`, 'dim'),
  ]);
  return e.steps();
};

export const DATA_SCENES: readonly Scene[] = [
  { id: 'kafka-lag', label: 'balancing partitions', weight: 8, build: kafkaLag },
  { id: 'redis-monitor', label: 'tailing cache traffic', weight: 8, build: redisMonitor },
  { id: 'object-sync', label: 'syncing objects', weight: 8, hasProgress: true, build: syncObjects },
  { id: 'query-plan', label: 'explaining query', weight: 7, build: queryPlan },
];
