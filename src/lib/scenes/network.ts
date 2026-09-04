import { bar, chunk, pad, padLeft, percent } from '../ansi';
import { DOMAINS, HOSTS, REGIONS, duration, ipv4, port, sha, stamp } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { OK, createEmitter } from './helpers';

const traceroute = (rng: Rng): readonly Step[] => {
  const e = createEmitter('trace-net');
  const target = rng.pick(DOMAINS);
  const hops = rng.int(6, 14);

  e.command(rng, `traceroute -q 3 ${target}`);
  e.append(110, [chunk(`traceroute to ${target} (${ipv4(rng)}), ${hops} hops max`, 'dim')]);

  for (let hop = 1; hop <= hops; hop++) {
    const lost = rng.chance(0.12);
    e.append(rng.int(70, 260), [
      chunk(padLeft(String(hop), 3) + '  ', 'dim'),
      chunk(pad(lost ? '* * *' : ipv4(rng), 18), lost ? 'warn' : 'default'),
      chunk(
        lost ? 'no reply' : `${rng.float(0.4, 180, 2)} ms  ${rng.float(0.4, 180, 2)} ms`,
        'dim',
      ),
    ]);
  }

  e.append(190, [chunk(`${OK} reached in ${hops} hops`, 'ok'), chunk(`  rtt avg ${duration(rng)}`, 'dim')]);
  return e.steps();
};

const portScan = (rng: Rng): readonly Step[] => {
  const e = createEmitter('nmap');
  const host = rng.pick(HOSTS);
  const found = rng.int(3, 7);

  e.command(rng, `nmap -sV -T4 ${host}.internal`);

  const id = e.append(100, [chunk('scanning 1000 ports ', 'dim')]);
  const ticks = rng.int(8, 14);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(70, 180), id, [
      chunk('scanning ', 'dim'),
      chunk(bar(ratio, 18), 'info'),
      chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
      chunk(`  ${Math.round(1000 * ratio)}/1000 ports`, 'dim'),
    ]);
  }

  e.append(140, [chunk('PORT      STATE  SERVICE      VERSION', 'dim', true)]);
  for (let i = 0; i < found; i++) {
    e.append(rng.int(60, 170), [
      chunk(pad(`${port(rng)}/tcp`, 10), 'cyan'),
      chunk(pad('open', 7), 'ok'),
      chunk(pad(rng.pick(['http', 'ssh', 'postgres', 'redis', 'grpc', 'amqp']), 13), 'default'),
      chunk(`build ${sha(rng)}`, 'dim'),
    ]);
  }
  e.append(190, [chunk(`${OK} ${found} services up`, 'ok', true), chunk(`  scan ${duration(rng)}`, 'dim')]);
  return e.steps();
};

const dnsPropagation = (rng: Rng): readonly Step[] => {
  const e = createEmitter('dns');
  const record = rng.pick(DOMAINS);

  e.command(rng, `dnscheck ${record} --type A --watch`);

  const ids = rng.sample(REGIONS, rng.int(4, 7)).map((region) =>
    e.append(rng.int(50, 120), [
      chunk(pad(region, 17), 'dim'),
      chunk('· waiting', 'warn'),
    ]),
  );

  ids.forEach((id, index) => {
    e.update(rng.int(120, 420), id, [
      chunk(pad(rng.pick(REGIONS), 17), 'dim'),
      chunk(`${OK} ${ipv4(rng)}`, 'ok'),
      chunk(`  ttl ${rng.int(30, 3600)}s  ${duration(rng)}`, 'dim'),
    ]);
    if (index === 0) e.append(rng.int(80, 200), [chunk('  cache flushed at edge', 'dim')]);
  });

  e.append(200, [chunk(`${OK} propagated to ${ids.length} regions`, 'ok', true)]);
  return e.steps();
};

const renewCertificate = (rng: Rng): readonly Step[] => {
  const e = createEmitter('acme');
  const domain = rng.pick(DOMAINS);

  e.command(rng, `certbot renew --cert-name ${domain}`);
  e.append(120, [chunk(`Account registered, requesting order for ${domain}`, 'dim')]);

  const steps = [
    'creating dns-01 challenge',
    'waiting for txt record',
    'answering challenge',
    'finalising order',
    'downloading chain',
  ];
  steps.forEach((text) => {
    e.append(rng.int(110, 320), [
      chunk(`  ${OK} `, 'ok'),
      chunk(pad(text, 28), 'default'),
      chunk(duration(rng), 'dim'),
    ]);
  });

  e.append(150, [
    chunk('  fingerprint ', 'dim'),
    chunk(sha(rng, 40).replace(/(.{2})(?=.)/g, '$1:').slice(0, 59), 'magenta'),
  ]);
  e.append(190, [
    chunk(`${OK} certificate valid `, 'ok', true),
    chunk(`until ${rng.int(2026, 2028)}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`, 'dim'),
  ]);
  return e.steps();
};

const crawlSite = (rng: Rng): readonly Step[] => {
  const e = createEmitter('crawl');
  const total = rng.int(120, 9000);

  e.command(rng, `crawler --sitemap https://${rng.pick(DOMAINS)}/sitemap.xml --depth ${rng.int(2, 6)}`);

  for (let i = 0; i < rng.int(9, 18); i++) {
    const code = rng.chance(0.12) ? rng.pick([301, 404, 429, 503]) : 200;
    e.append(rng.int(45, 210), [
      chunk(stamp(rng) + ' ', 'dim'),
      chunk(padLeft(String(code), 4) + ' ', code === 200 ? 'ok' : 'warn'),
      chunk(pad(`https://${rng.pick(DOMAINS)}/${rng.hex(5)}`, 42), 'default'),
      chunk(`${rng.int(2, 900)} links`, 'dim'),
    ]);
  }

  const id = e.append(100, [chunk('queue ', 'dim')]);
  for (let i = 1; i <= 6; i++) {
    e.update(rng.int(70, 170), id, [
      chunk('queue ', 'dim'),
      chunk(bar(i / 6, 16), 'accent'),
      chunk(` ${Math.round((total * i) / 6)}/${total} urls`, 'default'),
    ]);
  }
  e.append(190, [chunk(`${OK} index complete`, 'ok', true)]);
  return e.steps();
};

export const NETWORK_SCENES: readonly Scene[] = [
  { id: 'traceroute', label: 'tracing route', weight: 7, build: traceroute },
  { id: 'port-scan', label: 'scanning ports', weight: 7, hasProgress: true, build: portScan },
  { id: 'dns-propagation', label: 'propagating dns', weight: 6, build: dnsPropagation },
  { id: 'renew-cert', label: 'renewing certificate', weight: 6, build: renewCertificate },
  { id: 'crawl-site', label: 'crawling sitemap', weight: 7, hasProgress: true, build: crawlSite },
];
