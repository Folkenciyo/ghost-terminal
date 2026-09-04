import { bar, chunk, pad, padLeft, percent } from '../ansi';
import { MODULES, SERVICES, duration, filePath, semver, sha } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { FAIL, OK, createEmitter } from './helpers';

const CASES = [
  'resolves nested references', 'rejects malformed payloads', 'retries on 503',
  'keeps ordering under load', 'expires idle sessions', 'streams partial chunks',
  'hydrates without mismatch', 'debounces duplicate writes', 'rolls back on conflict',
  'caps the ring buffer', 'signs the outgoing token', 'honours the abort signal',
];

const testRun = (rng: Rng): readonly Step[] => {
  const e = createEmitter('test');
  const files = rng.int(12, 64);
  const tests = rng.int(90, 940);
  const failed = rng.chance(0.25) ? rng.int(1, 3) : 0;

  e.command(rng, rng.pick(['vitest run --coverage', 'pytest -q', 'go test ./...', 'cargo test']));
  e.append(120, [chunk(` RUN `, 'accent', true), chunk(` v${semver(rng)}`, 'dim')]);

  rng.sample(CASES, rng.int(5, 9)).forEach((name, index) => {
    const isFail = failed > 0 && index === 2;
    e.append(rng.int(60, 210), [
      chunk(` ${isFail ? FAIL : OK} `, isFail ? 'err' : 'ok'),
      chunk(pad(filePath(rng), 40), 'dim'),
      chunk(name, isFail ? 'err' : 'default'),
      chunk(`  ${duration(rng)}`, 'dim'),
    ]);
  });

  if (failed > 0) {
    e.append(200, [chunk(`  ${FAIL} expected 200, received ${rng.pick([409, 422, 500, 503])}`, 'err')]);
  }

  const covId = e.append(120, [chunk(' coverage ', 'dim')]);
  const ticks = rng.int(6, 12);
  for (let i = 1; i <= ticks; i++) {
    const ratio = 0.4 + (0.58 * i) / ticks;
    e.update(rng.int(60, 140), covId, [
      chunk(' coverage ', 'dim'),
      chunk(bar(ratio, 16), 'ok'),
      chunk(` ${padLeft(percent(ratio), 4)}`, 'default'),
    ]);
  }

  e.append(160, [
    chunk(' Test Files  ', 'dim'),
    chunk(`${files - (failed > 0 ? 1 : 0)} passed`, 'ok'),
    failed > 0 ? chunk(`, ${failed} failed`, 'err') : chunk('', 'dim'),
  ]);
  e.append(140, [chunk(' Tests       ', 'dim'), chunk(`${tests} passed`, 'ok', true)]);
  return e.steps();
};

const vulnScan = (rng: Rng): readonly Step[] => {
  const e = createEmitter('scan');
  const image = `ghcr.io/acme/${rng.pick(SERVICES)}:${semver(rng)}`;

  e.command(rng, `trivy image ${image}`);
  e.append(130, [chunk(`${image} (alpine 3.${rng.int(16, 21)})`, 'info')]);

  const scanId = e.append(90, [chunk('scanning ', 'dim')]);
  const ticks = rng.int(8, 15);
  for (let i = 1; i <= ticks; i++) {
    const ratio = i / ticks;
    e.update(rng.int(70, 170), scanId, [
      chunk('scanning ', 'dim'),
      chunk(bar(ratio, 20), 'warn'),
      chunk(` ${padLeft(percent(ratio), 4)} `, 'default'),
      chunk(`${rng.int(120, 9800)} pkgs`, 'dim'),
    ]);
  }

  const counts = { LOW: rng.int(0, 6), MEDIUM: rng.int(0, 4), HIGH: rng.int(0, 2) };
  e.append(150, [
    chunk('Total: ', 'dim'),
    chunk(String(counts.LOW + counts.MEDIUM + counts.HIGH), 'default', true),
    chunk(` (LOW: ${counts.LOW}, MEDIUM: ${counts.MEDIUM}, HIGH: ${counts.HIGH})`, 'warn'),
  ]);
  e.append(140, [chunk(`${OK} sbom written to sbom-${sha(rng)}.json`, 'ok')]);
  return e.steps();
};

const stackTrace = (rng: Rng): readonly Step[] => {
  const e = createEmitter('trace');
  const service = rng.pick(SERVICES);
  const kind = rng.pick(['TimeoutError', 'ECONNRESET', 'PanicUnwind', 'DeadlockDetected', 'OOMKilled']);

  e.append(200, [
    chunk(' ERROR ', 'err', true),
    chunk(` unhandled ${kind} in ${service}`, 'err'),
  ]);
  for (let i = 0; i < rng.int(3, 6); i++) {
    e.append(rng.int(50, 120), [
      chunk('    at ', 'dim'),
      chunk(`${rng.pick(MODULES)}::${rng.pick(['poll', 'flush', 'commit', 'drain', 'handle'])}`, 'magenta'),
      chunk(` (${filePath(rng)}:${rng.int(12, 640)}:${rng.int(2, 80)})`, 'dim'),
    ]);
  }
  e.append(180, [chunk('  supervisor ', 'dim'), chunk(`restarting ${service}`, 'warn')]);
  e.append(rng.int(220, 520), [
    chunk(`  ${OK} ${service} healthy again`, 'ok'),
    chunk(` after ${duration(rng)}`, 'dim'),
  ]);
  return e.steps();
};

export const QUALITY_SCENES: readonly Scene[] = [
  { id: 'test-run', label: 'running test suite', weight: 10, build: testRun },
  { id: 'vuln-scan', label: 'scanning image', weight: 7, hasProgress: true, build: vulnScan },
  { id: 'stack-trace', label: 'recovering from fault', weight: 6, build: stackTrace },
];
