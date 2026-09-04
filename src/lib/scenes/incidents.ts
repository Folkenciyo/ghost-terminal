import { chunk } from '../ansi';
import { SERVICES, duration, sha } from '../vocab';
import type { Rng, Scene, Step } from '../types';
import { createEmitter } from './helpers';
import { BUILD_SCENES } from './build-tools';
import { DATA_SCENES } from './data';
import { INFRA_SCENES } from './infra';
import { NETWORK_SCENES } from './network';
import { OPS_SCENES } from './ops';
import { QUALITY_SCENES } from './quality';
import { RUNTIME_SCENES } from './runtime';
import { SYSTEM_SCENES } from './system';

/** Steps borrowed from each beat — keeps a whole incident under the step cap. */
const BEAT_CAP = 110;

const CATALOGUE: readonly Scene[] = [
  ...BUILD_SCENES, ...QUALITY_SCENES, ...INFRA_SCENES, ...RUNTIME_SCENES,
  ...SYSTEM_SCENES, ...NETWORK_SCENES, ...DATA_SCENES, ...OPS_SCENES,
];

const sceneById = (id: string): Scene => {
  const found = CATALOGUE.find((scene) => scene.id === id);
  if (!found) throw new Error(`unknown scene in incident script: ${id}`);
  return found;
};

interface Beat {
  readonly sceneId: string;
  readonly note: string;
}

interface IncidentSpec {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  readonly alert: string;
  readonly beats: readonly Beat[];
  readonly resolution: string;
}

/**
 * An incident is an ordinary scene that stitches three existing scenes into a
 * story: alert, diagnosis, remediation, all-clear. Because it is just a Scene,
 * the contract suite covers it for free.
 */
const buildIncident = (spec: IncidentSpec) => (rng: Rng): readonly Step[] => {
  const service = rng.pick(SERVICES);
  const steps: Step[] = [];

  const head = createEmitter(`${spec.id}-head`);
  head.append(240, [
    chunk(' ALERT ', 'err', true),
    chunk(`  ${spec.alert.replace('{service}', service)}`, 'err'),
  ]);
  head.append(170, [
    chunk(`  incident ${sha(rng, 8)}`, 'dim'),
    chunk(`  severity ${rng.pick(['SEV1', 'SEV2', 'SEV3'])}`, 'warn'),
    chunk(`  paging on-call`, 'dim'),
  ]);
  steps.push(...head.steps());

  spec.beats.forEach((beat, index) => {
    const marker = createEmitter(`${spec.id}-beat${index}`);
    marker.append(260, [
      chunk(`  ▸ ${index + 1}/${spec.beats.length}  `, 'accent', true),
      chunk(beat.note.replace('{service}', service), 'default'),
    ]);
    steps.push(...marker.steps());
    steps.push(...sceneById(beat.sceneId).build(rng).slice(0, BEAT_CAP));
  });

  const tail = createEmitter(`${spec.id}-tail`);
  tail.append(280, [
    chunk(' RESOLVED ', 'ok', true),
    chunk(`  ${spec.resolution.replace('{service}', service)}`, 'ok'),
  ]);
  tail.append(190, [
    chunk(`  mttr ${duration(rng)}`, 'dim'),
    chunk(`  error budget ${rng.float(41, 99, 1)}% left`, 'dim'),
    chunk('  post-mortem drafted', 'dim'),
  ]);
  steps.push(...tail.steps());

  return steps;
};

const SPECS: readonly IncidentSpec[] = [
  {
    id: 'incident-5xx',
    label: 'handling 5xx incident',
    weight: 6,
    alert: 'error rate above threshold on {service}',
    beats: [
      { sceneId: 'http-log', note: 'tailing edge traffic for the failing route' },
      { sceneId: 'traceroute', note: 'checking the path to the upstream' },
      { sceneId: 'k8s-rollout', note: 'rolling {service} back to the last good build' },
    ],
    resolution: '{service} back within SLO',
  },
  {
    id: 'incident-disk',
    label: 'recovering disk pressure',
    weight: 5,
    alert: 'disk pressure evicting pods on {service}',
    beats: [
      { sceneId: 'sysmon', note: 'finding what is eating the node' },
      { sceneId: 'disk-check', note: 'verifying the filesystem before reclaiming' },
      { sceneId: 'object-sync', note: 'offloading cold artefacts to object storage' },
    ],
    resolution: 'node back under 70% utilisation',
  },
  {
    id: 'incident-supply',
    label: 'patching vulnerable dependency',
    weight: 5,
    alert: 'vulnerable transitive dependency shipped to {service}',
    beats: [
      { sceneId: 'vuln-scan', note: 'confirming the advisory against the running image' },
      { sceneId: 'npm-install', note: 'pulling the patched release' },
      { sceneId: 'test-run', note: 'proving nothing else broke' },
    ],
    resolution: 'patched build promoted, advisory closed',
  },
];

export const INCIDENT_SCENES: readonly Scene[] = SPECS.map((spec) => ({
  id: spec.id,
  label: spec.label,
  weight: spec.weight,
  build: buildIncident(spec),
}));
