import type { Scene } from '../types';
import { ART_SCENES } from './art';
import { BUILD_SCENES } from './build-tools';
import { DATA_SCENES } from './data';
import { INCIDENT_SCENES } from './incidents';
import { INFRA_SCENES } from './infra';
import { MEDIA_SCENES } from './media';
import { NETWORK_SCENES } from './network';
import { OPS_SCENES } from './ops';
import { QUALITY_SCENES } from './quality';
import { RUNTIME_SCENES } from './runtime';
import { SYSTEM_SCENES } from './system';

/** Every scene the engine can schedule. Order is irrelevant; weight is not. */
export const SCENES: readonly Scene[] = [
  ...BUILD_SCENES,
  ...QUALITY_SCENES,
  ...INFRA_SCENES,
  ...RUNTIME_SCENES,
  ...SYSTEM_SCENES,
  ...MEDIA_SCENES,
  ...NETWORK_SCENES,
  ...DATA_SCENES,
  ...OPS_SCENES,
  ...ART_SCENES,
  ...INCIDENT_SCENES,
];

export const SCENE_BY_ID: ReadonlyMap<string, Scene> = new Map(
  SCENES.map((scene) => [scene.id, scene]),
);
